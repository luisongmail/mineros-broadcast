/**
 * AuditRetentionJob — archiva y expira registros de audit_events
 * según la política definida en la Spec 30 §34.2:
 *   - HIGH severity: 5 años
 *   - MEDIUM severity: 2 años
 *   - LOW severity: 1 año
 *
 * Se ejecuta al startup y luego cada 24 h.
 */
import { pool } from '../db';

export interface RetentionConfig {
  /** Días de retención para eventos de severidad alta (default: 5 * 365) */
  highDays: number;
  /** Días de retención para severidad media (default: 2 * 365) */
  mediumDays: number;
  /** Días de retención para severidad baja (default: 365) */
  lowDays: number;
}

const DEFAULT_CONFIG: RetentionConfig = {
  highDays: Number(process.env.AUDIT_RETENTION_HIGH_DAYS ?? 5 * 365),
  mediumDays: Number(process.env.AUDIT_RETENTION_MEDIUM_DAYS ?? 2 * 365),
  lowDays: Number(process.env.AUDIT_RETENTION_LOW_DAYS ?? 365),
};

export interface RetentionResult {
  archivedHigh: number;
  archivedMedium: number;
  archivedLow: number;
  total: number;
  ranAt: string;
}

/**
 * Ejecuta el job de retención una vez.
 * Mueve registros expirados a `audit_events_archive` (si existe)
 * y los elimina de `audit_events`.
 */
export async function runRetentionJob(config: RetentionConfig = DEFAULT_CONFIG): Promise<RetentionResult> {
  const result: RetentionResult = {
    archivedHigh: 0,
    archivedMedium: 0,
    archivedLow: 0,
    total: 0,
    ranAt: new Date().toISOString(),
  };

  if (!pool) {
    console.warn('[AuditRetention] pool no disponible — job omitido');
    return result;
  }

  const conn = await pool.getConnection();
  try {
    // Verificar si existe la tabla de archivo
    const [tables] = await conn.execute<import('mysql2').RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_events_archive'`,
    );
    const archiveExists = tables.length > 0;

    interface RuleRow { level: string; days: number }
    const rules: RuleRow[] = [
      { level: 'high', days: config.highDays },
      { level: 'medium', days: config.mediumDays },
      { level: 'low', days: config.lowDays },
    ];

    for (const rule of rules) {
      // La severidad está embebida en el authorization_json → audit_level
      // El campo audit_level se determina por la regla que disparo la acción
      // Para la query usamos: si authorization_json->auditLevel = level
      const cutoff = `DATE_SUB(NOW(), INTERVAL ${rule.days} DAY)`;

      if (archiveExists) {
        // Copiar a archivo antes de borrar
        const [insertResult] = await conn.execute<import('mysql2').ResultSetHeader>(
          `INSERT IGNORE INTO audit_events_archive
             SELECT * FROM audit_events
             WHERE timestamp < ${cutoff}
               AND JSON_UNQUOTE(JSON_EXTRACT(authorization_json, '$.auditLevel')) = ?`,
          [rule.level],
        );
        const archived = insertResult.affectedRows;

        if (archived > 0) {
          await conn.execute(
            `DELETE FROM audit_events
             WHERE timestamp < ${cutoff}
               AND JSON_UNQUOTE(JSON_EXTRACT(authorization_json, '$.auditLevel')) = ?`,
            [rule.level],
          );
        }

        if (rule.level === 'high') result.archivedHigh = archived;
        else if (rule.level === 'medium') result.archivedMedium = archived;
        else result.archivedLow = archived;

        result.total += archived;
      } else {
        // Sin tabla de archivo: solo eliminar (mínimo de datos sensibles)
        const [deleteResult] = await conn.execute<import('mysql2').ResultSetHeader>(
          `DELETE FROM audit_events
           WHERE timestamp < ${cutoff}
             AND JSON_UNQUOTE(JSON_EXTRACT(authorization_json, '$.auditLevel')) = ?`,
          [rule.level],
        );
        const deleted = deleteResult.affectedRows;

        if (rule.level === 'high') result.archivedHigh = deleted;
        else if (rule.level === 'medium') result.archivedMedium = deleted;
        else result.archivedLow = deleted;

        result.total += deleted;
      }
    }

    if (result.total > 0) {
      console.log(`[AuditRetention] Completado: ${result.total} registros archivados/eliminados`, result);
    }
  } catch (err) {
    console.error('[AuditRetention] Error durante el job:', err);
  } finally {
    conn.release();
  }

  return result;
}

let _timer: ReturnType<typeof setInterval> | null = null;

/** Inicia el job periódico (cada 24 h). Llama una vez al startup. */
export function startRetentionScheduler(config?: RetentionConfig): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

  // Ejecutar al startup con delay de 30s para no competir con init de pool
  setTimeout(() => {
    void runRetentionJob(config).catch((e) => console.error('[AuditRetention] startup run error', e));
  }, 30_000);

  _timer = setInterval(() => {
    void runRetentionJob(config).catch((e) => console.error('[AuditRetention] scheduled run error', e));
  }, INTERVAL_MS);

  console.log('[AuditRetention] Scheduler iniciado — intervalo: 24 h');
}

/** Detiene el scheduler (para tests / graceful shutdown) */
export function stopRetentionScheduler(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}
