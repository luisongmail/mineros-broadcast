import crypto from 'node:crypto';
import type { ErrorCode } from '@playflow/core';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../lib/db';
import type {
  OverlayActionEnvelope,
  OverlayActionResult,
  OverlayLockRecord,
  OverlaySnapshotEnvelope,
  OverlaySnapshotPayload,
  OverlayStateRecord,
} from '../types';
import { buildSnapshotEnvelope } from '../middleware/validateIC003';

interface OverlayStateRow extends RowDataPacket {
  overlayId: string;
  zoneId: string;
  state: string | Record<string, unknown>;
  revision: number;
  operatorId: string;
  timestamp: Date | string;
}

interface OverlayLockRow extends RowDataPacket {
  overlayId: string;
  lockedBy: string;
  lockedUntil: Date | string;
  reason: string;
}

interface RevisionRow extends RowDataPacket {
  revision: number;
}

interface InMemoryOverlayStore {
  revision: number;
  previewState: OverlayStateRecord | null;
  programState: OverlayStateRecord | null;
  locks: OverlayLockRecord[];
  history: Array<Record<string, unknown>>;
}

const memoryStore: InMemoryOverlayStore = {
  revision: 0,
  previewState: null,
  programState: null,
  locks: [],
  history: [],
};

const OVERLAY_REVISION_LOCK = 'playflow_overlay_revision';

function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');
}

function createAuditId(): string {
  return `audit_${crypto.randomUUID().replace(/-/g, '')}`;
}

function createActionId(): string {
  return `action_${crypto.randomUUID().replace(/-/g, '')}`;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function parseStateRecord(row: OverlayStateRow | undefined | null): OverlayStateRecord | null {
  if (!row) {
    return null;
  }

  const statePayload = typeof row.state === 'string'
    ? JSON.parse(row.state) as Record<string, unknown>
    : row.state;

  return {
    overlayId: row.overlayId,
    zoneId: row.zoneId,
    state: (statePayload.state as OverlayStateRecord['state'] | undefined) ?? 'preview',
    revision: Number(row.revision),
    operatorId: row.operatorId,
    timestamp: toIsoString(row.timestamp),
    payload: (statePayload.payload as Record<string, unknown> | undefined) ?? undefined,
    payloadRef: typeof statePayload.payloadRef === 'string' ? statePayload.payloadRef : undefined,
    priority: typeof statePayload.priority === 'number' ? statePayload.priority : undefined,
    holdSeconds: typeof statePayload.holdSeconds === 'number' ? statePayload.holdSeconds : undefined,
    reason: typeof statePayload.reason === 'string' ? statePayload.reason : undefined,
    correlationId: typeof statePayload.correlationId === 'string' ? statePayload.correlationId : undefined,
  };
}

function buildStoredState(
  envelope: OverlayActionEnvelope,
  revision: number,
  state: OverlayStateRecord['state'],
): OverlayStateRecord {
  const overlayId = envelope.payload.overlayId?.trim();
  const operatorId = envelope.payload.operatorId?.trim();

  if (!overlayId) {
    throw new OverlayStateError('overlayId es obligatorio para esta acción.', 400, 'VALIDATION_ERROR');
  }

  if (!operatorId) {
    throw new OverlayStateError('operatorId autenticado es obligatorio para esta acción.', 400, 'VALIDATION_ERROR');
  }

  return {
    overlayId,
    zoneId: envelope.payload.zoneId ?? 'program',
    state,
    revision,
    operatorId,
    timestamp: new Date().toISOString(),
    payload: envelope.payload.payload,
    payloadRef: envelope.payload.payloadRef,
    priority: envelope.payload.priority,
    holdSeconds: envelope.payload.holdSeconds,
    reason: envelope.payload.reason,
    correlationId: envelope.correlationId,
  };
}

export class OverlayStateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OverlayStateError';
  }
}

export class OverlayStateService {
  async getSnapshot(latencyMs = 0): Promise<OverlaySnapshotPayload> {
    if (!pool) {
      return this.buildSnapshotFromMemory(latencyMs);
    }

    const [previewRows, programRows, lockRows, revisionRows] = await Promise.all([
      pool.execute<OverlayStateRow[]>(
        `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
         FROM overlay_preview_states
         ORDER BY revision DESC
         LIMIT 1`,
      ),
      pool.execute<OverlayStateRow[]>(
        `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
         FROM overlay_program_states
         ORDER BY revision DESC
         LIMIT 1`,
      ),
      pool.execute<OverlayLockRow[]>(
        `SELECT overlayId, lockedBy, lockedUntil, reason
         FROM overlay_locks
         WHERE lockedUntil > UTC_TIMESTAMP(3)
         ORDER BY lockedUntil DESC`,
      ),
      pool.execute<RevisionRow[]>(
        `SELECT GREATEST(
           COALESCE((SELECT MAX(revision) FROM overlay_preview_states), 0),
           COALESCE((SELECT MAX(revision) FROM overlay_program_states), 0),
           COALESCE((SELECT MAX(previewRevision) FROM overlay_action_history), 0),
           COALESCE((SELECT MAX(programRevision) FROM overlay_action_history), 0)
         ) AS revision`,
      ),
    ]);

    const previewState = parseStateRecord(previewRows[0][0]);
    const programState = parseStateRecord(programRows[0][0]);
    const locks = lockRows[0].map((row) => ({
      overlayId: row.overlayId,
      lockedBy: row.lockedBy,
      lockedUntil: toIsoString(row.lockedUntil),
      reason: row.reason,
    }));

    return {
      revision: Number(revisionRows[0][0]?.revision ?? 0),
      previewState,
      programState,
      locks: {
        overlays: locks,
        zones: locks.map((lock) => lock.overlayId),
        scorebugLocked: locks.some((lock) => lock.overlayId === 'scorebug'),
      },
      conflicts: [],
      latencyMs,
      connectionStatus: 'connected',
    };
  }

  async getSnapshotEnvelope(correlationId?: string, latencyMs = 0): Promise<OverlaySnapshotEnvelope> {
    return buildSnapshotEnvelope(await this.getSnapshot(latencyMs), correlationId);
  }

  async getPreviewStateForOverlay(overlayId?: string): Promise<OverlayStateRecord | null> {
    if (!overlayId) {
      return null;
    }

    if (!pool) {
      return memoryStore.previewState?.overlayId === overlayId ? memoryStore.previewState : null;
    }

    const [rows] = await pool.execute<OverlayStateRow[]>(
      `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
       FROM overlay_preview_states
       WHERE overlayId = ?
       ORDER BY revision DESC
       LIMIT 1`,
      [overlayId],
    );

    return parseStateRecord(rows[0]);
  }

  async previewOverlay(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;
      memoryStore.previewState = buildStoredState(envelope, nextRevision, 'preview');
      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const nextRevision = await this.getNextRevision(connection);
      const previewState = buildStoredState(envelope, nextRevision, 'preview');

      await connection.execute(
        `INSERT INTO overlay_preview_states (overlayId, zoneId, state, revision, operatorId, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           zoneId = VALUES(zoneId),
           state = VALUES(state),
           revision = VALUES(revision),
           operatorId = VALUES(operatorId),
           timestamp = VALUES(timestamp)`,
        [
          previewState.overlayId,
          previewState.zoneId,
          JSON.stringify(previewState),
          previewState.revision,
          previewState.operatorId,
          new Date(previewState.timestamp),
        ],
      );

      const programState = await this.getLatestProgramState(connection);
      await this.insertAudit(connection, {
        auditId,
        operatorId: previewState.operatorId,
        action: envelope.payload.action,
        overlayId: previewState.overlayId,
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: null,
        afterState: previewState,
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId: previewState.operatorId,
        previewRevision: previewState.revision,
        programRevision: programState?.revision ?? null,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  async takeOverlay(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();
    const overlayId = envelope.payload.overlayId?.trim();

    if (!overlayId) {
      throw new OverlayStateError('overlayId es obligatorio para take_overlay.', 400, 'VALIDATION_ERROR');
    }

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const currentPreview = memoryStore.previewState;

      if (!currentPreview || currentPreview.overlayId !== overlayId) {
        throw new OverlayStateError('No existe preview vigente para el overlay solicitado.', 404, 'NOT_FOUND');
      }

      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;
      memoryStore.programState = {
        ...currentPreview,
        state: 'program',
        revision: nextRevision,
        timestamp: new Date().toISOString(),
      };
      memoryStore.previewState = null;
      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const previewState = await this.getPreviewState(connection, overlayId);

      if (!previewState) {
        throw new OverlayStateError('No existe preview vigente para el overlay solicitado.', 404, 'NOT_FOUND');
      }

      const nextRevision = await this.getNextRevision(connection);
      const programState: OverlayStateRecord = {
        ...previewState,
        state: 'program',
        revision: nextRevision,
        timestamp: new Date().toISOString(),
      };

      await connection.execute(
        `INSERT INTO overlay_program_states (overlayId, zoneId, state, revision, operatorId, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           zoneId = VALUES(zoneId),
           state = VALUES(state),
           revision = VALUES(revision),
           operatorId = VALUES(operatorId),
           timestamp = VALUES(timestamp)`,
        [
          programState.overlayId,
          programState.zoneId,
          JSON.stringify(programState),
          programState.revision,
          programState.operatorId,
          new Date(programState.timestamp),
        ],
      );

      await connection.execute('DELETE FROM overlay_preview_states WHERE overlayId = ?', [previewState.overlayId]);

      await this.insertAudit(connection, {
        auditId,
        operatorId: programState.operatorId,
        action: envelope.payload.action,
        overlayId: programState.overlayId,
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: previewState,
        afterState: programState,
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId: programState.operatorId,
        previewRevision: previewState.revision,
        programRevision: programState.revision,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  async forceShowOverlay(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();

    if (!envelope.payload.zoneId?.trim()) {
      throw new OverlayStateError('zoneId es obligatorio para force_show.', 400, 'VALIDATION_ERROR');
    }

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;
      const programState = buildStoredState(envelope, nextRevision, 'program');
      memoryStore.programState = programState;

      if (memoryStore.previewState?.overlayId === programState.overlayId) {
        memoryStore.previewState = null;
      }

      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const nextRevision = await this.getNextRevision(connection);
      const programState = buildStoredState(envelope, nextRevision, 'program');
      const previousProgramState = await this.getProgramStateForOverlay(connection, programState.overlayId);

      await connection.execute(
        `INSERT INTO overlay_program_states (overlayId, zoneId, state, revision, operatorId, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           zoneId = VALUES(zoneId),
           state = VALUES(state),
           revision = VALUES(revision),
           operatorId = VALUES(operatorId),
           timestamp = VALUES(timestamp)`,
        [
          programState.overlayId,
          programState.zoneId,
          JSON.stringify(programState),
          programState.revision,
          programState.operatorId,
          new Date(programState.timestamp),
        ],
      );

      await connection.execute('DELETE FROM overlay_preview_states WHERE overlayId = ?', [programState.overlayId]);

      await this.insertAudit(connection, {
        auditId,
        operatorId: programState.operatorId,
        action: envelope.payload.action,
        overlayId: programState.overlayId,
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: previousProgramState,
        afterState: programState,
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId: programState.operatorId,
        previewRevision: nextRevision,
        programRevision: programState.revision,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  async hideOverlay(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();
    const overlayId = envelope.payload.overlayId?.trim();

    if (!overlayId) {
      throw new OverlayStateError('overlayId es obligatorio para hide_overlay.', 400, 'VALIDATION_ERROR');
    }

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const previousPreview = memoryStore.previewState?.overlayId === overlayId ? memoryStore.previewState : null;
      const previousProgram = memoryStore.programState?.overlayId === overlayId ? memoryStore.programState : null;

      if (!previousPreview && !previousProgram) {
        throw new OverlayStateError('No existe un overlay visible o en preview con ese overlayId.', 404, 'NOT_FOUND');
      }

      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;

      if (previousPreview) {
        memoryStore.previewState = null;
      }

      if (previousProgram) {
        memoryStore.programState = null;
      }

      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const previousPreview = await this.getPreviewState(connection, overlayId);
      const previousProgram = await this.getProgramStateForOverlay(connection, overlayId);

      if (!previousPreview && !previousProgram) {
        throw new OverlayStateError('No existe un overlay visible o en preview con ese overlayId.', 404, 'NOT_FOUND');
      }

      const nextRevision = await this.getNextRevision(connection);

      await connection.execute('DELETE FROM overlay_preview_states WHERE overlayId = ?', [overlayId]);
      await connection.execute('DELETE FROM overlay_program_states WHERE overlayId = ?', [overlayId]);

      await this.insertAudit(connection, {
        auditId,
        operatorId: envelope.payload.operatorId ?? '',
        action: envelope.payload.action,
        overlayId,
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: previousProgram ?? previousPreview,
        afterState: null,
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId: envelope.payload.operatorId ?? '',
        previewRevision: nextRevision,
        programRevision: previousProgram ? nextRevision : null,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  async hideAllOverlays(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();
    const operatorId = envelope.payload.operatorId?.trim();

    if (!operatorId) {
      throw new OverlayStateError('operatorId autenticado es obligatorio para hide_all.', 400, 'VALIDATION_ERROR');
    }

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const previousPreview = memoryStore.previewState;
      const previousProgram = memoryStore.programState?.overlayId === 'scorebug' ? null : memoryStore.programState;
      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;
      memoryStore.previewState = null;

      if (memoryStore.programState?.overlayId !== 'scorebug') {
        memoryStore.programState = null;
      }

      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      void previousPreview;
      void previousProgram;
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const previousPreview = await this.getLatestPreviewState(connection);
      const previousProgram = await this.getLatestProgramState(connection, 'scorebug');
      const nextRevision = await this.getNextRevision(connection);

      await connection.execute('DELETE FROM overlay_preview_states');
      await connection.execute('DELETE FROM overlay_program_states WHERE overlayId <> ?', ['scorebug']);

      await this.insertAudit(connection, {
        auditId,
        operatorId,
        action: envelope.payload.action,
        overlayId: previousProgram?.overlayId ?? previousPreview?.overlayId ?? 'all',
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: previousProgram ?? previousPreview,
        afterState: await this.getLatestProgramState(connection),
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId,
        previewRevision: nextRevision,
        programRevision: previousProgram ? nextRevision : null,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  async clearPreview(envelope: OverlayActionEnvelope, latencyMs: number): Promise<OverlayActionResult> {
    const actionId = createActionId();
    const auditId = createAuditId();
    const operatorId = envelope.payload.operatorId?.trim();

    if (!operatorId) {
      throw new OverlayStateError('operatorId autenticado es obligatorio para clear_preview.', 400, 'VALIDATION_ERROR');
    }

    if (!pool) {
      this.assertExpectedRevisionInMemory(envelope);
      const nextRevision = memoryStore.revision + 1;
      memoryStore.revision = nextRevision;
      memoryStore.previewState = null;
      memoryStore.history.push({ actionId, auditId, action: envelope.payload.action, success: true });
      return this.buildActionResult(envelope, actionId, auditId, latencyMs);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await this.acquireRevisionLock(connection);
      await this.assertExpectedRevision(connection, envelope);

      const previousPreview = await this.getLatestPreviewState(connection);
      const nextRevision = await this.getNextRevision(connection);

      await connection.execute('DELETE FROM overlay_preview_states');

      await this.insertAudit(connection, {
        auditId,
        operatorId,
        action: envelope.payload.action,
        overlayId: previousPreview?.overlayId ?? 'preview',
        correlationId: envelope.correlationId,
        result: 'success',
        beforeState: previousPreview,
        afterState: null,
      });
      await this.insertHistory(connection, {
        actionId,
        action: envelope.payload.action,
        operatorId,
        previewRevision: nextRevision,
        programRevision: null,
        success: true,
        auditId,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseRevisionLock(connection);
      connection.release();
    }

    return this.buildActionResult(envelope, actionId, auditId, latencyMs);
  }

  private assertExpectedRevisionInMemory(envelope: OverlayActionEnvelope): void {
    const expectedRevision = envelope.payload.expectedRevision;

    if (typeof expectedRevision !== 'number') {
      throw new OverlayStateError('expectedRevision es obligatorio para esta acción.', 400, 'VALIDATION_ERROR');
    }

    if (expectedRevision !== memoryStore.revision) {
      throw new OverlayStateError(
        'La revisión esperada no coincide con el snapshot global actual.',
        409,
        'CONFLICT',
        { expectedRevision, currentRevision: memoryStore.revision },
      );
    }
  }

  private async acquireRevisionLock(connection: PoolConnection): Promise<void> {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 5) AS acquired',
      [OVERLAY_REVISION_LOCK],
    );

    if (Number(rows[0]?.acquired ?? 0) !== 1) {
      throw new OverlayStateError(
        'No se pudo adquirir el lock de revisión de overlays.',
        500,
        'INTERNAL_SERVER_ERROR',
      );
    }
  }

  private async releaseRevisionLock(connection: PoolConnection): Promise<void> {
    try {
      await connection.query('SELECT RELEASE_LOCK(?)', [OVERLAY_REVISION_LOCK]);
    } catch {
      // noop
    }
  }

  private async assertExpectedRevision(
    connection: PoolConnection,
    envelope: OverlayActionEnvelope,
  ): Promise<void> {
    const expectedRevision = envelope.payload.expectedRevision;

    if (typeof expectedRevision !== 'number') {
      throw new OverlayStateError('expectedRevision es obligatorio para esta acción.', 400, 'VALIDATION_ERROR');
    }

    const currentRevision = await this.getCurrentRevision(connection);

    if (currentRevision !== expectedRevision) {
      throw new OverlayStateError(
        'La revisión esperada no coincide con el snapshot global actual.',
        409,
        'CONFLICT',
        { expectedRevision, currentRevision },
      );
    }
  }

  private async buildActionResult(
    envelope: OverlayActionEnvelope,
    actionId: string,
    auditId: string,
    latencyMs: number,
  ): Promise<OverlayActionResult> {
    return {
      actionId,
      auditId,
      snapshot: await this.getSnapshotEnvelope(envelope.correlationId, latencyMs),
    };
  }

  private buildSnapshotFromMemory(latencyMs: number): OverlaySnapshotPayload {
    return {
      revision: memoryStore.revision,
      previewState: memoryStore.previewState,
      programState: memoryStore.programState,
      locks: {
        overlays: memoryStore.locks,
        zones: memoryStore.locks.map((lock) => lock.overlayId),
        scorebugLocked: memoryStore.locks.some((lock) => lock.overlayId === 'scorebug'),
      },
      conflicts: [],
      latencyMs,
      connectionStatus: 'connected',
    };
  }

  private async getCurrentRevision(connection: PoolConnection): Promise<number> {
    const [rows] = await connection.query<RevisionRow[]>(
      `SELECT GREATEST(
         COALESCE((SELECT MAX(revision) FROM overlay_preview_states), 0),
         COALESCE((SELECT MAX(revision) FROM overlay_program_states), 0),
         COALESCE((SELECT MAX(previewRevision) FROM overlay_action_history), 0),
         COALESCE((SELECT MAX(programRevision) FROM overlay_action_history), 0)
       ) AS revision`,
    );

    return Number(rows[0]?.revision ?? 0);
  }

  private async getNextRevision(connection: PoolConnection): Promise<number> {
    return (await this.getCurrentRevision(connection)) + 1;
  }

  private async getLatestProgramState(
    connection: PoolConnection,
    excludeOverlayId?: string,
  ): Promise<OverlayStateRecord | null> {
    const hasExclude = typeof excludeOverlayId === 'string' && excludeOverlayId.length > 0;
    const [rows] = await connection.query<OverlayStateRow[]>(
      hasExclude
        ? `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
           FROM overlay_program_states
           WHERE overlayId <> ?
           ORDER BY revision DESC
           LIMIT 1
           FOR UPDATE`
        : `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
           FROM overlay_program_states
           ORDER BY revision DESC
           LIMIT 1
           FOR UPDATE`,
      hasExclude ? [excludeOverlayId] : [],
    );

    return parseStateRecord(rows[0]);
  }

  private async getLatestPreviewState(connection: PoolConnection): Promise<OverlayStateRecord | null> {
    const [rows] = await connection.query<OverlayStateRow[]>(
      `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
       FROM overlay_preview_states
       ORDER BY revision DESC
       LIMIT 1
       FOR UPDATE`,
    );

    return parseStateRecord(rows[0]);
  }

  private async getPreviewState(connection: PoolConnection, overlayId: string): Promise<OverlayStateRecord | null> {
    const [rows] = await connection.query<OverlayStateRow[]>(
      `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
       FROM overlay_preview_states
       WHERE overlayId = ?
       ORDER BY revision DESC
       LIMIT 1
       FOR UPDATE`,
      [overlayId],
    );

    return parseStateRecord(rows[0]);
  }

  private async getProgramStateForOverlay(connection: PoolConnection, overlayId: string): Promise<OverlayStateRecord | null> {
    const [rows] = await connection.query<OverlayStateRow[]>(
      `SELECT overlayId, zoneId, state, revision, operatorId, timestamp
       FROM overlay_program_states
       WHERE overlayId = ?
       ORDER BY revision DESC
       LIMIT 1
       FOR UPDATE`,
      [overlayId],
    );

    return parseStateRecord(rows[0]);
  }

  private async insertAudit(
    connection: PoolConnection,
    input: {
      auditId: string;
      operatorId: string;
      action: string;
      overlayId: string;
      correlationId: string;
      result: 'success' | 'error';
      beforeState: OverlayStateRecord | null;
      afterState: OverlayStateRecord | null;
    },
  ): Promise<void> {
    const beforeHash = input.beforeState ? hashPayload(input.beforeState) : null;
    const afterHash = input.afterState ? hashPayload(input.afterState) : null;
    const eventHash = hashPayload({ ...input, beforeHash, afterHash });

    await connection.execute(
      `INSERT INTO audit_events (
         audit_id,
         actor_user_id,
         action,
         resource_type,
         resource_id,
         result,
         decision,
         correlation_id,
         change_summary,
         before_hash,
         after_hash,
         event_hash
       ) VALUES (?, ?, ?, 'overlay', ?, ?, 'allow', ?, ?, ?, ?, ?)`,
      [
        input.auditId,
        input.operatorId,
        input.action,
        input.overlayId,
        input.result,
        input.correlationId,
        JSON.stringify({ before: input.beforeState, after: input.afterState }),
        beforeHash,
        afterHash,
        eventHash,
      ],
    );
  }

  private async insertHistory(
    connection: PoolConnection,
    input: {
      actionId: string;
      action: string;
      operatorId: string;
      previewRevision: number | null;
      programRevision: number | null;
      success: boolean;
      auditId: string;
    },
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO overlay_action_history (
         actionId,
         action,
         operatorId,
         previewRevision,
         programRevision,
         success,
         auditId
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.actionId,
        input.action,
        input.operatorId,
        input.previewRevision,
        input.programRevision,
        input.success,
        input.auditId,
      ],
    );
  }
}
