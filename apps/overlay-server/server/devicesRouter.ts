// ---------------------------------------------------------------------------
// devicesRouter — endpoints para importación de datos de dispositivos
// POST /api/v1/devices/import-csv
// POST /api/v1/devices/rapsodo/connect
// POST /api/v1/devices/rapsodo/disconnect
// GET  /api/v1/devices/status
// Spec 29 § 6
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import { CsvFileImportAdapter, RapsodoAdapter, type CsvFormat, type RapsodoConfig } from '@mineros/device-adapters';
import type { NormalizedPitchData } from '@mineros/device-adapters';

import { pool } from './db';
import { stateStore } from './stateStore';
import { getDbColumns } from './routerUtils';
import { calculateZone } from './pitchesRouter';

const router = Router();

/** Caché de columnas de la tabla pitches (reusa la de pitchesRouter) */
let pitchColumnsCache: Set<string> | null = null;
async function getPitchColumns(): Promise<Set<string>> {
  if (pitchColumnsCache) return pitchColumnsCache;
  pitchColumnsCache = await getDbColumns('pitches');
  return pitchColumnsCache;
}

/**
 * POST /api/v1/devices/import-csv
 *
 * Body (multipart o JSON con campo csvContent):
 *   - csvContent: string  — contenido del CSV
 *   - format: 'rapsodo' | 'trackman' | 'auto' (default: 'auto')
 *   - gameId: string (opcional, usa el juego activo si se omite)
 *   - atBatId: string (opcional)
 *   - pitcherId: string (opcional)
 *   - batterId: string (opcional)
 */
router.post('/import-csv', async (req: Request, res: Response) => {
  try {
    const { csvContent, format = 'auto', atBatId, pitcherId, batterId } = req.body as {
      csvContent?: string;
      format?: CsvFormat;
      gameId?: string;
      atBatId?: string;
      pitcherId?: string;
      batterId?: string;
    };

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({ status: 400, result: 'error', message: 'csvContent requerido (string)' });
      return;
    }

    const state = stateStore.getState();
    const gameId = (req.body as { gameId?: string }).gameId ?? state.gameId;

    if (!gameId) {
      res.status(400).json({ status: 400, result: 'error', message: 'gameId requerido o no hay juego activo' });
      return;
    }

    const adapter = new CsvFileImportAdapter(`csv-import-${Date.now()}`);
    await adapter.connect({ deviceId: adapter.deviceId });

    const pitches: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => pitches.push(d));

    const parseResult = adapter.importCsvContent(csvContent, format as CsvFormat);
    await adapter.disconnect();

    if (pitches.length === 0) {
      res.status(200).json({
        status: 200,
        result: 'ok',
        imported: 0,
        skipped: parseResult.skipped,
        message: 'Sin pitcheos válidos en el CSV',
      });
      return;
    }

    // Persistir en BD si hay pool disponible
    let dbImported = 0;
    if (pool) {
      const columns = await getPitchColumns();
      const pitcherIdToUse = pitcherId ?? state.currentPitcherId ?? null;
      const batterIdToUse = batterId ?? state.currentBatterId ?? null;

      for (const pitch of pitches) {
        const zone = calculateZone(pitch.plateX, pitch.plateZ, 1.07, 0.47); // szTop/szBottom adulto promedio
        const insertColumns = ['game_id', 'pitcher_player_id', 'batter_player_id'];
        const insertValues: Array<string | number | null> = [
          gameId,
          pitcherIdToUse ?? null,
          batterIdToUse ?? null,
        ];
        const placeholders = ['?', '?', '?'];

        const metricFields: Array<[string, number | string | null | undefined]> = [
          ['plate_x', pitch.plateX],
          ['plate_z', pitch.plateZ],
          ['zone', zone],
          ['start_speed', pitch.startSpeed],
          ['end_speed', pitch.endSpeed],
          ['spin_rate', pitch.spinRate],
          ['spin_axis', pitch.spinAxis],
          ['pfx_x', pitch.pfxX],
          ['pfx_z', pitch.pfxZ],
          ['pitch_class', pitch.pitchClass],
          ['pitch_type', pitch.pitchClass],
          ['confidence', pitch.confidence],
          ['device_id', adapter.deviceId],
          ['at_bat_id', atBatId ?? null],
        ];

        for (const [col, val] of metricFields) {
          if (columns.has(col) && val !== undefined) {
            insertColumns.push(col);
            insertValues.push(val ?? null);
            placeholders.push('?');
          }
        }

        if (columns.has('timestamp')) {
          insertColumns.push('timestamp');
          placeholders.push('CURRENT_TIMESTAMP(3)');
        }

        await pool.query(
          `INSERT INTO pitches (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          insertValues,
        );
        dbImported++;
      }
    }

    res.status(200).json({
      status: 200,
      result: 'ok',
      format: format === 'auto' ? (parseResult.imported > 0 ? 'detected' : 'unknown') : format,
      parsed: parseResult.imported,
      skipped: parseResult.skipped,
      imported: dbImported,
      message: `${dbImported} pitcheo(s) importado(s) correctamente`,
    });
  } catch (err) {
    console.error('[devicesRouter] import-csv error:', err);
    res.status(500).json({ status: 500, result: 'error', message: String(err) });
  }
});

export default router;

// ---------------------------------------------------------------------------
// Estado global del adaptador Rapsodo (singleton por proceso del servidor)
// ---------------------------------------------------------------------------
let rapsodoAdapter: RapsodoAdapter | null = null;

/** Persiste un pitch Rapsodo en BD si hay pool disponible */
async function persistRapsodoPitch(pitch: NormalizedPitchData, gameId: string): Promise<void> {
  if (!pool) return;
  const columns = await getPitchColumns();
  const zone = calculateZone(pitch.plateX, pitch.plateZ, 1.07, 0.47);
  const state = stateStore.getState();

  const insertColumns = ['game_id', 'pitcher_player_id', 'batter_player_id'];
  const insertValues: Array<string | number | null> = [
    gameId,
    state.currentPitcherId ?? null,
    state.currentBatterId  ?? null,
  ];
  const placeholders = ['?', '?', '?'];

  const metricFields: Array<[string, number | string | null | undefined]> = [
    ['plate_x',    pitch.plateX],
    ['plate_z',    pitch.plateZ],
    ['zone',       zone],
    ['start_speed', pitch.startSpeed],
    ['end_speed',  pitch.endSpeed],
    ['spin_rate',  pitch.spinRate],
    ['spin_axis',  pitch.spinAxis],
    ['pfx_x',      pitch.pfxX],
    ['pfx_z',      pitch.pfxZ],
    ['pitch_class', pitch.pitchClass],
    ['pitch_type',  pitch.pitchClass],
    ['confidence',  pitch.confidence],
    ['device_id',   rapsodoAdapter?.deviceId ?? null],
  ];

  for (const [col, val] of metricFields) {
    if (columns.has(col) && val !== undefined) {
      insertColumns.push(col);
      insertValues.push(val ?? null);
      placeholders.push('?');
    }
  }
  if (columns.has('timestamp')) {
    insertColumns.push('timestamp');
    placeholders.push('CURRENT_TIMESTAMP(3)');
  }

  await pool.query(
    `INSERT INTO pitches (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    insertValues,
  );
}

// ---------------------------------------------------------------------------
// POST /api/v1/devices/rapsodo/connect
// ---------------------------------------------------------------------------
router.post('/rapsodo/connect', async (req: Request, res: Response) => {
  try {
    if (rapsodoAdapter) {
      await rapsodoAdapter.disconnect().catch(() => {});
    }

    const { host, port, pollIntervalMs, gameId } = req.body as Partial<RapsodoConfig> & { gameId?: string };

    if (!host) {
      res.status(400).json({ status: 400, result: 'error', message: 'host requerido' });
      return;
    }

    const state = stateStore.getState();
    const activeGameId = gameId ?? state.gameId;

    rapsodoAdapter = new RapsodoAdapter(`rapsodo-${host}`);
    rapsodoAdapter.onPitchData((pitch) => {
      void persistRapsodoPitch(pitch, activeGameId).catch((err: unknown) => {
        console.warn('[devicesRouter] Rapsodo persist error:', err);
      });
    });

    await rapsodoAdapter.connect({ deviceId: `rapsodo-${host}`, host, port, pollIntervalMs });

    res.json({
      status: 200,
      result: 'ok',
      message: `Rapsodo conectado en ${host}:${port ?? 8080}`,
      deviceId: rapsodoAdapter.deviceId,
    });
  } catch (err) {
    rapsodoAdapter = null;
    console.error('[devicesRouter] rapsodo/connect error:', err);
    res.status(500).json({ status: 500, result: 'error', message: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/devices/rapsodo/disconnect
// ---------------------------------------------------------------------------
router.post('/rapsodo/disconnect', async (_req: Request, res: Response) => {
  if (!rapsodoAdapter) {
    res.json({ status: 200, result: 'ok', message: 'Rapsodo ya estaba desconectado' });
    return;
  }
  await rapsodoAdapter.disconnect();
  rapsodoAdapter = null;
  res.json({ status: 200, result: 'ok', message: 'Rapsodo desconectado' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/devices/status
// ---------------------------------------------------------------------------
router.get('/status', async (_req: Request, res: Response) => {
  const rapsodoStatus = rapsodoAdapter
    ? await rapsodoAdapter.healthCheck()
    : 'disconnected';

  res.json({
    status: 200,
    result: 'ok',
    devices: {
      rapsodo: {
        connected: rapsodoAdapter !== null,
        deviceId: rapsodoAdapter?.deviceId ?? null,
        health: rapsodoStatus,
      },
    },
  });
});
