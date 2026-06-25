import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { demoSponsors, type DemoSponsor } from './editorDemoData';
import { pool } from './db';
import {
  optionalBoolean,
  optionalInteger,
  optionalString,
  parseJsonColumn,
  sendCaughtError,
  sendErr,
  sendOk,
  toIsoString,
} from './routerUtils';

interface SponsorRow extends RowDataPacket {
  id: string;
  name: string;
  brand: string;
  asset_id: string | null;
  status: string;
  priority: number;
  weight: number;
  allowed_placements: unknown;
  start_date: string | Date | null;
  end_date: string | Date | null;
  exposure_limits: unknown;
  blackout_rules: unknown;
  metadata: unknown;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SponsorPayload {
  id: string;
  name: string;
  brand: string;
  asset_id: string | null;
  status: string;
  priority: number;
  weight: number;
  allowed_placements: string[];
  start_date: string | null;
  end_date: string | null;
  exposure_limits: Record<string, unknown>;
  blackout_rules: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  active: boolean;
}

function mapSponsor(row: SponsorRow | DemoSponsor): SponsorPayload {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    asset_id: row.asset_id,
    status: row.status,
    priority: row.priority,
    weight: row.weight,
    allowed_placements: parseJsonColumn<string[]>(row.allowed_placements, []),
    start_date: row.start_date ? toIsoString(row.start_date) : null,
    end_date: row.end_date ? toIsoString(row.end_date) : null,
    exposure_limits: parseJsonColumn<Record<string, unknown>>(row.exposure_limits, {}),
    blackout_rules: parseJsonColumn<unknown[]>(row.blackout_rules, []),
    metadata: parseJsonColumn<Record<string, unknown>>(row.metadata, {}),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
    active: row.status === 'active',
  };
}

const router = Router();

router.get('/sponsors', async (request: Request, response: Response) => {
  try {
    const onlyActive = optionalBoolean(request.query.active) === true;

    if (!pool) {
      const sponsors = demoSponsors
        .filter((entry) => (onlyActive ? entry.status === 'active' : true))
        .map(mapSponsor);
      sendOk(response, sponsors);
      return;
    }

    const whereClause = onlyActive ? "WHERE status = 'active'" : '';
    const [rows] = await pool.query<SponsorRow[]>(
      `SELECT id, name, brand, asset_id, status, priority, weight, allowed_placements, start_date,
              end_date, exposure_limits, blackout_rules, metadata, created_at, updated_at
       FROM sponsors
       ${whereClause}
       ORDER BY priority DESC, weight DESC, name ASC`,
    );

    sendOk(response, rows.map(mapSponsor));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los sponsors');
  }
});

router.get('/sponsors/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      const sponsor = demoSponsors.find((entry) => entry.id === request.params.id);
      if (!sponsor) {
        sendErr(response, 'Sponsor no encontrado', 404);
        return;
      }

      sendOk(response, mapSponsor(sponsor));
      return;
    }

    const [rows] = await pool.query<SponsorRow[]>(
      `SELECT id, name, brand, asset_id, status, priority, weight, allowed_placements, start_date,
              end_date, exposure_limits, blackout_rules, metadata, created_at, updated_at
       FROM sponsors WHERE id = ? LIMIT 1`,
      [request.params.id],
    );

    if (rows.length === 0) {
      sendErr(response, 'Sponsor no encontrado', 404);
      return;
    }

    sendOk(response, mapSponsor(rows[0]));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar el sponsor');
  }
});

router.post('/sponsors', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear sponsors', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const name = optionalString(body.name);
    const brand = optionalString(body.brand);

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    if (!brand) {
      sendErr(response, 'brand es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO sponsors (
        id, name, brand, asset_id, status, priority, weight, allowed_placements,
        start_date, end_date, exposure_limits, blackout_rules, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        brand,
        optionalString(body.asset_id),
        optionalString(body.status) ?? 'draft',
        optionalInteger(body.priority) ?? 50,
        optionalInteger(body.weight) ?? 10,
        JSON.stringify(Array.isArray(body.allowed_placements) ? body.allowed_placements : []),
        optionalString(body.start_date),
        optionalString(body.end_date),
        JSON.stringify(body.exposure_limits && typeof body.exposure_limits === 'object' ? body.exposure_limits : {}),
        JSON.stringify(Array.isArray(body.blackout_rules) ? body.blackout_rules : []),
        JSON.stringify(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      ],
    );

    const [rows] = await pool.query<SponsorRow[]>(
      `SELECT id, name, brand, asset_id, status, priority, weight, allowed_placements, start_date,
              end_date, exposure_limits, blackout_rules, metadata, created_at, updated_at
       FROM sponsors WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapSponsor(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el sponsor');
  }
});

router.put('/sponsors/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar sponsors', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];
    const stringFields: Array<[string, string]> = [
      ['name', 'name'],
      ['brand', 'brand'],
      ['asset_id', 'asset_id'],
      ['status', 'status'],
      ['start_date', 'start_date'],
      ['end_date', 'end_date'],
    ];

    for (const [field, column] of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates.push(`${column} = ?`);
        params.push(optionalString(body[field]));
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
      updates.push('priority = ?');
      params.push(optionalInteger(body.priority) ?? 50);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'weight')) {
      updates.push('weight = ?');
      params.push(optionalInteger(body.weight) ?? 10);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'allowed_placements')) {
      updates.push('allowed_placements = ?');
      params.push(JSON.stringify(Array.isArray(body.allowed_placements) ? body.allowed_placements : []));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'exposure_limits')) {
      updates.push('exposure_limits = ?');
      params.push(JSON.stringify(body.exposure_limits && typeof body.exposure_limits === 'object' ? body.exposure_limits : {}));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'blackout_rules')) {
      updates.push('blackout_rules = ?');
      params.push(JSON.stringify(Array.isArray(body.blackout_rules) ? body.blackout_rules : []));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'metadata')) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}));
    }

    if (updates.length === 0) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    params.push(request.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE sponsors SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      params,
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Sponsor no encontrado', 404);
      return;
    }

    const [rows] = await pool.query<SponsorRow[]>(
      `SELECT id, name, brand, asset_id, status, priority, weight, allowed_placements, start_date,
              end_date, exposure_limits, blackout_rules, metadata, created_at, updated_at
       FROM sponsors WHERE id = ? LIMIT 1`,
      [request.params.id],
    );

    sendOk(response, mapSponsor(rows[0]));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el sponsor');
  }
});

router.delete('/sponsors/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para eliminar sponsors', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM sponsors WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) {
      sendErr(response, 'Sponsor no encontrado', 404);
      return;
    }

    sendOk(response, { deleted: request.params.id });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar el sponsor');
  }
});

export default router;
