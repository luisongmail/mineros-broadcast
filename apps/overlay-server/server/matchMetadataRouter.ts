/**
 * matchMetadataRouter
 * Persiste y sirve metadatos de partido (competencia, venue, sponsors, etc.)
 * que no son parte del GameEngine pero sí del Scoreboard y otros overlays.
 *
 * Almacenamiento: archivo JSON en storage/metadata/{gameId}.json
 * Fallback: si no existe, devuelve objeto vacío para que el cliente use defaults.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';

import { hasDatabaseConfigured, pool } from './db';
import type { MatchMetadata, SponsorEntry } from '../src/matchMetadata';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METADATA_DIR = path.resolve(__dirname, '../storage/metadata');

function ensureDir() {
  if (!existsSync(METADATA_DIR)) mkdirSync(METADATA_DIR, { recursive: true });
}

function metadataPath(gameId: string): string {
  // Sanitize gameId to avoid path traversal
  const safe = gameId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(METADATA_DIR, `${safe}.json`);
}

export type { MatchMetadata, SponsorEntry };

function readMetadata(gameId: string): MatchMetadata {
  const file = metadataPath(gameId);
  if (!existsSync(file)) return { gameId };
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as MatchMetadata;
  } catch {
    return { gameId };
  }
}

function writeMetadata(gameId: string, data: MatchMetadata): void {
  ensureDir();
  writeFileSync(metadataPath(gameId), JSON.stringify({ ...data, gameId }, null, 2), 'utf8');
}

export const matchMetadataRouter = Router();

// GET /api/games/:id/metadata
matchMetadataRouter.get('/games/:id/metadata', (req: Request, res: Response) => {
  const { id } = req.params;
  const metadata = readMetadata(id);
  res.json({ result: 'ok', payload: metadata });
});

/** Valida que todos los sponsorIds del array existan en MySQL. Devuelve los IDs inválidos. */
async function validateSponsorIds(entries: SponsorEntry[]): Promise<string[]> {
  if (!hasDatabaseConfigured() || entries.length === 0) return [];
  const ids = entries.map((e) => e.sponsorId);
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM sponsors WHERE id IN (${placeholders})`,
    ids,
  );
  const found = new Set((rows as { id: string }[]).map((r) => r.id));
  return ids.filter((id) => !found.has(id));
}

// PUT /api/games/:id/metadata  — reemplaza todo el metadata
matchMetadataRouter.put('/games/:id/metadata', async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Partial<MatchMetadata>;

  // Validar sponsors si vienen en el body
  if (Array.isArray(body.sponsors) && body.sponsors.length > 0) {
    const invalid = await validateSponsorIds(body.sponsors);
    if (invalid.length > 0) {
      res.status(400).json({
        result: 'error',
        payload: { message: `Sponsors no registrados: ${invalid.join(', ')}. Regístralos en el tab Sponsors primero.` },
      });
      return;
    }
  }

  const current = readMetadata(id);
  const updated: MatchMetadata = { ...current, ...body, gameId: id };
  writeMetadata(id, updated);
  res.json({ result: 'ok', payload: updated });
});

// PATCH /api/games/:id/metadata/sponsors  — reemplaza solo la lista de sponsors
matchMetadataRouter.patch('/games/:id/metadata/sponsors', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sponsors } = req.body as { sponsors: SponsorEntry[] };
  if (!Array.isArray(sponsors)) {
    res.status(400).json({ result: 'error', payload: { message: 'sponsors debe ser un array' } });
    return;
  }

  // Validar que todos los IDs existan en la tabla sponsors
  const invalid = await validateSponsorIds(sponsors);
  if (invalid.length > 0) {
    res.status(400).json({
      result: 'error',
      payload: { message: `Sponsors no registrados: ${invalid.join(', ')}. Regístralos en el tab Sponsors primero.` },
    });
    return;
  }

  const current = readMetadata(id);
  const updated: MatchMetadata = { ...current, gameId: id, sponsors };
  writeMetadata(id, updated);
  res.json({ result: 'ok', payload: updated });
});
