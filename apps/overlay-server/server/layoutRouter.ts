import { Router, type Request, type Response } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

import { pool } from './db';

export type OverlayAnimIn = 'fade_in' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom_in';
export type OverlayAnimOut = 'fade_out' | 'slide_up_out' | 'slide_down_out' | 'slide_left_out' | 'slide_right_out' | 'zoom_out';

export interface LayoutZone {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  animIn?: OverlayAnimIn;
  animOut?: OverlayAnimOut;
}

export interface Layout {
  id: string;
  name: string;
  isDefault: boolean;
  zones: Record<string, LayoutZone>;
  createdAt: string;
  updatedAt: string;
}

function rowToLayout(row: RowDataPacket): Layout {
  const zones =
    typeof row.zones === 'string' ? (JSON.parse(row.zones) as Record<string, LayoutZone>) : (row.zones as Record<string, LayoutZone>);

  return {
    id: row.id as string,
    name: row.name as string,
    isDefault: Boolean(row.is_default),
    zones,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function sendOk(res: Response, payload: unknown): void {
  res.status(200).json({ status: 200, result: 'ok', payload });
}

function sendErr(res: Response, msg: string, code = 400): void {
  res.status(code).json({ status: code, result: 'error', payload: { message: msg } });
}

function randomId(): string {
  return crypto.randomUUID();
}

export const layoutRouter = Router();

// GET /layouts — listar todos
layoutRouter.get('/layouts', async (_req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM layouts ORDER BY is_default DESC, name ASC');
  sendOk(res, rows.map(rowToLayout));
});

// GET /layouts/active/:gameId — layout activo para un juego
layoutRouter.get('/layouts/active/:gameId', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const { gameId } = req.params;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.* FROM layouts l
     INNER JOIN game_layouts gl ON gl.layout_id = l.id
     WHERE gl.game_id = ?`,
    [gameId],
  );
  if (rows.length > 0) { sendOk(res, rowToLayout(rows[0])); return; }

  // Si no hay asignación, usar el layout por defecto
  const [defaultRows] = await pool.query<RowDataPacket[]>('SELECT * FROM layouts WHERE is_default = 1 LIMIT 1');
  if (defaultRows.length === 0) { sendErr(res, 'No hay layout por defecto', 404); return; }
  sendOk(res, rowToLayout(defaultRows[0]));
});

// GET /layouts/:id — obtener layout por id
layoutRouter.get('/layouts/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM layouts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) { sendErr(res, 'Layout no encontrado', 404); return; }
  sendOk(res, rowToLayout(rows[0]));
});

// POST /layouts — crear nuevo layout
layoutRouter.post('/layouts', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const body = req.body as { name?: unknown; zones?: unknown; isDefault?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) { sendErr(res, 'name es requerido'); return; }
  const zones = typeof body.zones === 'object' && body.zones ? body.zones : {};
  const isDefault = Boolean(body.isDefault);
  const id = randomId();
  await pool.query<ResultSetHeader>(
    'INSERT INTO layouts (id, name, is_default, zones) VALUES (?, ?, ?, ?)',
    [id, name, isDefault ? 1 : 0, JSON.stringify(zones)],
  );
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM layouts WHERE id = ?', [id]);
  sendOk(res, rowToLayout(rows[0]));
});

// PUT /layouts/:id — actualizar layout existente
layoutRouter.put('/layouts/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const body = req.body as { name?: unknown; zones?: unknown; isDefault?: unknown };
  const sets: string[] = [];
  const params: unknown[] = [];
  if (typeof body.name === 'string' && body.name.trim()) {
    sets.push('name = ?');
    params.push(body.name.trim());
  }
  if (typeof body.zones === 'object' && body.zones) {
    sets.push('zones = ?');
    params.push(JSON.stringify(body.zones));
  }
  if (typeof body.isDefault === 'boolean') {
    sets.push('is_default = ?');
    params.push(body.isDefault ? 1 : 0);
  }
  if (sets.length === 0) { sendErr(res, 'Nada que actualizar'); return; }
  params.push(req.params.id);
  await pool.query<ResultSetHeader>(`UPDATE layouts SET ${sets.join(', ')} WHERE id = ?`, params);
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM layouts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) { sendErr(res, 'Layout no encontrado', 404); return; }
  sendOk(res, rowToLayout(rows[0]));
});

// DELETE /layouts/:id — eliminar layout (no el por defecto)
layoutRouter.delete('/layouts/:id', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT is_default FROM layouts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) { sendErr(res, 'Layout no encontrado', 404); return; }
  if (rows[0].is_default) { sendErr(res, 'No se puede eliminar el layout por defecto'); return; }
  await pool.query<ResultSetHeader>('DELETE FROM layouts WHERE id = ?', [req.params.id]);
  sendOk(res, { deleted: req.params.id });
});

// PUT /layouts/game/:gameId — asignar layout a un juego
layoutRouter.put('/layouts/game/:gameId', async (req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const { gameId } = req.params;
  const body = req.body as { layoutId?: unknown };
  const layoutId = typeof body.layoutId === 'string' ? body.layoutId : null;
  if (!layoutId) { sendErr(res, 'layoutId es requerido'); return; }
  const [check] = await pool.query<RowDataPacket[]>('SELECT id FROM layouts WHERE id = ?', [layoutId]);
  if (check.length === 0) { sendErr(res, 'Layout no encontrado', 404); return; }
  await pool.query<ResultSetHeader>(
    'INSERT INTO game_layouts (game_id, layout_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE layout_id = ?, assigned_at = CURRENT_TIMESTAMP',
    [gameId, layoutId, layoutId],
  );
  sendOk(res, { gameId, layoutId });
});

const OVERLAY_DEFAULT_ANIM: Record<string, { animIn: OverlayAnimIn; animOut: OverlayAnimOut }> = {
  scorebug:           { animIn: 'slide_up',   animOut: 'slide_down_out' },
  scoreboard:         { animIn: 'fade_in',    animOut: 'fade_out' },
  batter:             { animIn: 'slide_up',   animOut: 'fade_out' },
  pitcher:            { animIn: 'slide_up',   animOut: 'fade_out' },
  'next-batters':     { animIn: 'slide_up',   animOut: 'fade_out' },
  lineup:             { animIn: 'slide_left', animOut: 'slide_left_out' },
  'inning-transition':{ animIn: 'fade_in',    animOut: 'fade_out' },
  'final-score':      { animIn: 'zoom_in',    animOut: 'zoom_out' },
  announcement:       { animIn: 'slide_up',   animOut: 'fade_out' },
  social:             { animIn: 'slide_up',   animOut: 'fade_out' },
  countdown:          { animIn: 'fade_in',    animOut: 'fade_out' },
  'sponsor-break':    { animIn: 'slide_up',   animOut: 'fade_out' },
  substitution:       { animIn: 'slide_up',   animOut: 'fade_out' },
  'game-event':       { animIn: 'slide_up',   animOut: 'fade_out' },
};

// POST /layouts/apply-defaults — añade animaciones por defecto a todos los layouts existentes
layoutRouter.post('/layouts/apply-defaults', async (_req: Request, res: Response) => {
  if (!pool) { sendErr(res, 'DB no disponible', 503); return; }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, zones FROM layouts');
  let updated = 0;
  for (const row of rows) {
    const zones: Record<string, LayoutZone> =
      typeof row.zones === 'string' ? (JSON.parse(row.zones) as Record<string, LayoutZone>) : (row.zones as Record<string, LayoutZone>);
    let changed = false;
    for (const [id, defaults] of Object.entries(OVERLAY_DEFAULT_ANIM)) {
      if (zones[id]) {
        if (!zones[id].animIn)  { zones[id].animIn  = defaults.animIn;  changed = true; }
        if (!zones[id].animOut) { zones[id].animOut = defaults.animOut; changed = true; }
      }
    }
    if (changed) {
      await pool.query<ResultSetHeader>('UPDATE layouts SET zones = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(zones), row.id as string]);
      updated++;
    }
  }
  sendOk(res, { total: rows.length, updated });
});
