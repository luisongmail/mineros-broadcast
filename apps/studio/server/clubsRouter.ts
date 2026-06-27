import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool } from './db';
import { optionalString, sendCaughtError, sendErr, sendOk, toIsoString } from './routerUtils';

// ── Tipos internos ────────────────────────────────────────────────────────

interface AssociationRow extends RowDataPacket {
  id: string; name: string; short_name: string | null;
  country_code: string | null; sport_id: string | null; website: string | null;
  created_at: string | Date; updated_at: string | Date;
}

interface ClubRow extends RowDataPacket {
  id: string; name: string; short_name: string | null;
  city: string | null; country: string | null; country_code: string | null;
  logo_asset_id: string | null; federated: number | boolean;
  association_id: string | null; association_name: string | null;
  notes: string | null; created_at: string | Date; updated_at: string | Date;
}

function assocPayload(r: AssociationRow) {
  return {
    id: r.id, name: r.name, shortName: r.short_name,
    countryCode: r.country_code, sportId: r.sport_id, website: r.website,
    createdAt: toIsoString(r.created_at), updatedAt: toIsoString(r.updated_at),
  };
}

function clubPayload(r: ClubRow) {
  return {
    id: r.id, name: r.name, shortName: r.short_name,
    city: r.city, country: r.country, countryCode: r.country_code,
    logoAssetId: r.logo_asset_id,
    federated: Boolean(r.federated),
    associationId: r.association_id, associationName: r.association_name,
    notes: r.notes,
    createdAt: toIsoString(r.created_at), updatedAt: toIsoString(r.updated_at),
  };
}

function slugId(prefix: string, name: string): string {
  return prefix + '-' + name
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// ASSOCIATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/associations', async (_req: Request, res: Response) => {
  if (!pool) { res.json({ status: 200, result: 'ok', payload: [] }); return; }
  try {
    const [rows] = await pool.query<AssociationRow[]>('SELECT * FROM associations ORDER BY name');
    res.json({ status: 200, result: 'ok', payload: rows.map(assocPayload) });
  } catch (e) { sendCaughtError(res, e, 'Error en associations'); }
});

router.post('/associations', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const b = req.body as Record<string, unknown>;
  const name = optionalString(b.name);
  if (!name) { sendErr(res, 'name es obligatorio'); return; }
  const id = optionalString(b.id) || slugId('assoc', name);
  try {
    await pool.query<ResultSetHeader>(
      'INSERT INTO associations (id,name,short_name,country_code,sport_id,website) VALUES (?,?,?,?,?,?)',
      [id, name, optionalString(b.shortName), optionalString(b.countryCode), optionalString(b.sportId), optionalString(b.website)],
    );
    const [rows] = await pool.query<AssociationRow[]>('SELECT * FROM associations WHERE id=?', [id]);
    res.status(201).json({ status: 201, result: 'ok', payload: assocPayload(rows[0]) });
  } catch (e) { sendCaughtError(res, e, 'Error al crear asociación'); }
});

router.put('/associations/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const b = req.body as Record<string, unknown>;
  try {
    await pool.query<ResultSetHeader>(
      `UPDATE associations SET name=COALESCE(?,name), short_name=?, country_code=?, sport_id=?, website=? WHERE id=?`,
      [optionalString(b.name), optionalString(b.shortName), optionalString(b.countryCode), optionalString(b.sportId), optionalString(b.website), req.params.id],
    );
    const [rows] = await pool.query<AssociationRow[]>('SELECT * FROM associations WHERE id=?', [req.params.id]);
    if (!rows.length) { sendErr(res, 'No encontrada', 404); return; }
    sendOk(res, assocPayload(rows[0]));
  } catch (e) { sendCaughtError(res, e, 'Error al actualizar asociación'); }
});

router.delete('/associations/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  try {
    await pool.query<ResultSetHeader>('DELETE FROM associations WHERE id=?', [req.params.id]);
    sendOk(res, { deleted: req.params.id });
  } catch (e) { sendCaughtError(res, e, 'Error al eliminar asociación'); }
});

// ═══════════════════════════════════════════════════════════════════════════
// CLUBS
// ═══════════════════════════════════════════════════════════════════════════

const CLUB_SELECT = `
  SELECT c.*, a.name AS association_name
  FROM clubs c
  LEFT JOIN associations a ON a.id = c.association_id
`;

router.get('/clubs', async (_req: Request, res: Response) => {
  if (!pool) { res.json({ status: 200, result: 'ok', payload: [] }); return; }
  try {
    const [rows] = await pool.query<ClubRow[]>(`${CLUB_SELECT} ORDER BY c.name`);
    res.json({ status: 200, result: 'ok', payload: rows.map(clubPayload) });
  } catch (e) { sendCaughtError(res, e, 'Error en clubs'); }
});

router.get('/clubs/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  try {
    const [rows] = await pool.query<ClubRow[]>(`${CLUB_SELECT} WHERE c.id=?`, [req.params.id]);
    if (!rows.length) { sendErr(res, 'Club no encontrado', 404); return; }
    sendOk(res, clubPayload(rows[0]));
  } catch (e) { sendCaughtError(res, e, 'Error en club'); }
});

router.post('/clubs', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const b = req.body as Record<string, unknown>;
  const name = optionalString(b.name);
  if (!name) { sendErr(res, 'name es obligatorio'); return; }
  const id = optionalString(b.id) || slugId('club', name);
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO clubs (id,name,short_name,city,country,country_code,logo_asset_id,federated,association_id,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, name, optionalString(b.shortName), optionalString(b.city), optionalString(b.country),
       optionalString(b.countryCode), optionalString(b.logoAssetId),
       b.federated ? 1 : 0, optionalString(b.associationId), optionalString(b.notes)],
    );
    const [rows] = await pool.query<ClubRow[]>(`${CLUB_SELECT} WHERE c.id=?`, [id]);
    res.status(201).json({ status: 201, result: 'ok', payload: clubPayload(rows[0]) });
  } catch (e) { sendCaughtError(res, e, 'Error al crear club'); }
});

router.put('/clubs/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const b = req.body as Record<string, unknown>;
  try {
    await pool.query<ResultSetHeader>(
      `UPDATE clubs SET name=COALESCE(?,name), short_name=?, city=?, country=?, country_code=?,
       logo_asset_id=?, federated=?, association_id=?, notes=? WHERE id=?`,
      [optionalString(b.name), optionalString(b.shortName), optionalString(b.city), optionalString(b.country),
       optionalString(b.countryCode), optionalString(b.logoAssetId),
       b.federated ? 1 : 0, optionalString(b.associationId), optionalString(b.notes), req.params.id],
    );
    const [rows] = await pool.query<ClubRow[]>(`${CLUB_SELECT} WHERE c.id=?`, [req.params.id]);
    if (!rows.length) { sendErr(res, 'Club no encontrado', 404); return; }
    sendOk(res, clubPayload(rows[0]));
  } catch (e) { sendCaughtError(res, e, 'Error al actualizar club'); }
});

router.delete('/clubs/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  try {
    await pool.query<ResultSetHeader>('DELETE FROM clubs WHERE id=?', [req.params.id]);
    sendOk(res, { deleted: req.params.id });
  } catch (e) { sendCaughtError(res, e, 'Error al eliminar club'); }
});

export default router;
