import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool } from './db';
import { optionalInteger, optionalString, sendCaughtError, sendErr, sendOk, toIsoString } from './routerUtils';

interface VenueRow extends RowDataPacket {
  id: string;
  name: string;
  photo_asset_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  country_code: string | null;
  google_place_id: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  capacity: number | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function toPayload(r: VenueRow) {
  return {
    id:             r.id,
    name:           r.name,
    photoAssetId:   r.photo_asset_id,
    address: {
      line1:        r.address_line1,
      line2:        r.address_line2,
      city:         r.city,
      stateProvince: r.state_province,
      postalCode:   r.postal_code,
      country:      r.country,
      countryCode:  r.country_code,
    },
    google: {
      placeId:   r.google_place_id,
      latitude:  r.latitude  != null ? Number(r.latitude)  : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
    },
    capacity:  r.capacity,
    notes:     r.notes,
    createdAt: toIsoString(r.created_at),
    updatedAt: toIsoString(r.updated_at),
  };
}

/** Genera un ID slug a partir del nombre */
function slugId(name: string): string {
  return 'venue-' + name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const router = Router();

// GET /api/venues
router.get('/venues', async (_req: Request, res: Response) => {
  if (!pool) { res.json({ status: 200, result: 'ok', payload: [] }); return; }
  try {
    const [rows] = await pool.query<VenueRow[]>(
      'SELECT * FROM venues ORDER BY name ASC',
    );
    res.json({ status: 200, result: 'ok', payload: rows.map(toPayload) });
  } catch (e) { sendCaughtError(res, e, 'Error en venues'); }
});

// GET /api/venues/:id
router.get('/venues/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 404); return; }
  try {
    const [rows] = await pool.query<VenueRow[]>('SELECT * FROM venues WHERE id = ?', [req.params.id]);
    if (rows.length === 0) { sendErr(res, 'Estadio no encontrado', 404); return; }
    sendOk(res, toPayload(rows[0]));
  } catch (e) { sendCaughtError(res, e, 'Error en venues'); }
});

// POST /api/venues
router.post('/venues', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const b = req.body as Record<string, unknown>;
  const name = optionalString(b.name);
  if (!name) { sendErr(res, 'name es obligatorio', 400); return; }

  const id = optionalString(b.id) || slugId(name);
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO venues
        (id, name, photo_asset_id,
         address_line1, address_line2, city, state_province, postal_code, country, country_code,
         google_place_id, latitude, longitude,
         capacity, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, name,
        optionalString(b.photoAssetId),
        optionalString(b.address_line1 ?? (b.address as Record<string,unknown>)?.line1),
        optionalString(b.address_line2 ?? (b.address as Record<string,unknown>)?.line2),
        optionalString(b.city         ?? (b.address as Record<string,unknown>)?.city),
        optionalString(b.state_province ?? (b.address as Record<string,unknown>)?.stateProvince),
        optionalString(b.postal_code  ?? (b.address as Record<string,unknown>)?.postalCode),
        optionalString(b.country      ?? (b.address as Record<string,unknown>)?.country),
        optionalString(b.country_code ?? (b.address as Record<string,unknown>)?.countryCode),
        optionalString(b.google_place_id ?? (b.google as Record<string,unknown>)?.placeId),
        (b.google as Record<string,unknown>)?.latitude  != null ? Number((b.google as Record<string,unknown>).latitude)  : null,
        (b.google as Record<string,unknown>)?.longitude != null ? Number((b.google as Record<string,unknown>).longitude) : null,
        optionalInteger(b.capacity),
        optionalString(b.notes),
      ],
    );
    const [rows] = await pool.query<VenueRow[]>('SELECT * FROM venues WHERE id = ?', [id]);
    res.status(201).json({ status: 201, result: 'ok', payload: toPayload(rows[0]) });
  } catch (e) { sendCaughtError(res, e, 'Error en venues'); }
});

// PUT /api/venues/:id
router.put('/venues/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  const { id } = req.params;
  const b = req.body as Record<string, unknown>;
  try {
    await pool.query<ResultSetHeader>(
      `UPDATE venues SET
        name            = COALESCE(?, name),
        photo_asset_id  = ?,
        address_line1   = ?,
        address_line2   = ?,
        city            = ?,
        state_province  = ?,
        postal_code     = ?,
        country         = ?,
        country_code    = ?,
        google_place_id = ?,
        latitude        = ?,
        longitude       = ?,
        capacity        = ?,
        notes           = ?
       WHERE id = ?`,
      [
        optionalString(b.name),
        optionalString(b.photoAssetId),
        optionalString(b.address_line1 ?? (b.address as Record<string,unknown>)?.line1),
        optionalString(b.address_line2 ?? (b.address as Record<string,unknown>)?.line2),
        optionalString(b.city         ?? (b.address as Record<string,unknown>)?.city),
        optionalString(b.state_province ?? (b.address as Record<string,unknown>)?.stateProvince),
        optionalString(b.postal_code  ?? (b.address as Record<string,unknown>)?.postalCode),
        optionalString(b.country      ?? (b.address as Record<string,unknown>)?.country),
        optionalString(b.country_code ?? (b.address as Record<string,unknown>)?.countryCode),
        optionalString(b.google_place_id ?? (b.google as Record<string,unknown>)?.placeId),
        (b.google as Record<string,unknown>)?.latitude  != null ? Number((b.google as Record<string,unknown>).latitude)  : null,
        (b.google as Record<string,unknown>)?.longitude != null ? Number((b.google as Record<string,unknown>).longitude) : null,
        optionalInteger(b.capacity),
        optionalString(b.notes),
        id,
      ],
    );
    const [rows] = await pool.query<VenueRow[]>('SELECT * FROM venues WHERE id = ?', [id]);
    if (rows.length === 0) { sendErr(res, 'Estadio no encontrado', 404); return; }
    sendOk(res, toPayload(rows[0]));
  } catch (e) { sendCaughtError(res, e, 'Error en venues'); }
});

// DELETE /api/venues/:id
router.delete('/venues/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'Sin base de datos', 503); return; }
  try {
    await pool.query<ResultSetHeader>('DELETE FROM venues WHERE id = ?', [req.params.id]);
    sendOk(res, { deleted: req.params.id });
  } catch (e) { sendCaughtError(res, e, 'Error en venues'); }
});

export default router;
