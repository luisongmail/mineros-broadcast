import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { demoCategories, type DemoCategory } from './editorDemoData';
import { pool } from './db';
import { optionalBoolean, optionalString, sendCaughtError, sendErr, sendOk, toIsoString, toTinyInt } from './routerUtils';

interface CategoryRow extends RowDataPacket {
  id: string;
  sport_id: string;
  name: string;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  active: 0 | 1;
  created_at: string | Date;
}

interface CategoryPayload {
  id: string;
  sport_id: string;
  name: string;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  active: boolean;
  created_at: string;
}

function mapCategory(row: CategoryRow | DemoCategory): CategoryPayload {
  return {
    id: row.id,
    sport_id: row.sport_id,
    name: row.name,
    description: row.description,
    age_min: (row as CategoryRow).age_min ?? null,
    age_max: (row as CategoryRow).age_max ?? null,
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
  };
}

const DEMO_SPORTS = [
  { id: 'softball_fast_f', name: 'Softball Femenino',  gender: 'female', has_pitcher: true  },
  { id: 'softball_fast_m', name: 'Softball Masculino', gender: 'male',   has_pitcher: true  },
  { id: 'baseball_f',      name: 'Béisbol Femenino',   gender: 'female', has_pitcher: true  },
  { id: 'baseball_m',      name: 'Béisbol Masculino',  gender: 'male',   has_pitcher: true  },
  { id: 'baseball5',       name: 'Béisbol5',           gender: 'mixed',  has_pitcher: false },
  { id: 'baseball',        name: 'Béisbol',            gender: 'mixed',  has_pitcher: true  },
  { id: 'baseball_amateur',name: 'Béisbol Amateur',    gender: 'mixed',  has_pitcher: true  },
  { id: 'softball_fast',   name: 'Softball Rápido',    gender: 'mixed',  has_pitcher: true  },
  { id: 'softball_slow',   name: 'Softball Lento',     gender: 'mixed',  has_pitcher: true  },
];

const router = Router();

router.get('/sports', async (_request: Request, response: Response) => {
  try {
    if (!pool) {
      sendOk(response, DEMO_SPORTS);
      return;
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, gender, has_pitcher FROM sports ORDER BY name ASC',
    );
    sendOk(response, rows);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los deportes');
  }
});

router.get('/categories', async (request: Request, response: Response) => {
  try {
    const sportId = optionalString(request.query.sport_id);

    if (!pool) {
      const items = demoCategories
        .filter((category) => (sportId ? category.sport_id === sportId : true))
        .map(mapCategory);
      sendOk(response, items);
      return;
    }

    const filters: string[] = [];
    const params: string[] = [];

    if (sportId) {
      filters.push('sport_id = ?');
      params.push(sportId);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT id, sport_id, name, description, age_min, age_max, active, created_at
       FROM categories
       ${whereClause}
       ORDER BY active DESC, name ASC`,
      params,
    );

    sendOk(response, rows.map(mapCategory));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar las categorías');
  }
});

router.post('/categories', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear categorías', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const sportId = optionalString(body.sport_id);
    const name = optionalString(body.name);
    const description = optionalString(body.description);
    const active = optionalBoolean(body.active);

    if (!sportId) {
      sendErr(response, 'sport_id es requerido');
      return;
    }

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO categories (id, sport_id, name, description, age_min, age_max, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sportId, name, description, (body.age_min as number | null) ?? null, (body.age_max as number | null) ?? null, toTinyInt(active ?? true)],
    );

    const [rows] = await pool.query<CategoryRow[]>(
      'SELECT id, sport_id, name, description, age_min, age_max, active, created_at FROM categories WHERE id = ? LIMIT 1',
      [id],
    );

    sendOk(response, mapCategory(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear la categoría');
  }
});

router.put('/categories/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar categorías', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    const sportId = optionalString(body.sport_id);
    const name = optionalString(body.name);
    const description = Object.prototype.hasOwnProperty.call(body, 'description') ? optionalString(body.description) : undefined;
    const active = optionalBoolean(body.active);

    if (sportId) {
      updates.push('sport_id = ?');
      params.push(sportId);
    }

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (active !== null) {
      updates.push('active = ?');
      params.push(toTinyInt(active));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'age_min')) {
      updates.push('age_min = ?');
      params.push((body.age_min as number | null) ?? null);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'age_max')) {
      updates.push('age_max = ?');
      params.push((body.age_max as number | null) ?? null);
    }

    if (updates.length === 0) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    params.push(request.params.id);
    const [result] = await pool.query<ResultSetHeader>(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    if (result.affectedRows === 0) {
      sendErr(response, 'Categoría no encontrada', 404);
      return;
    }

    const [rows] = await pool.query<CategoryRow[]>(
      'SELECT id, sport_id, name, description, age_min, age_max, active, created_at FROM categories WHERE id = ? LIMIT 1',
      [request.params.id],
    );

    sendOk(response, mapCategory(rows[0]));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar la categoría');
  }
});

router.delete('/categories/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para eliminar categorías', 503);
      return;
    }

    await pool.query<ResultSetHeader>('DELETE FROM team_categories WHERE category_id = ?', [request.params.id]);
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [request.params.id]);

    if (result.affectedRows === 0) {
      sendErr(response, 'Categoría no encontrada', 404);
      return;
    }

    sendOk(response, { deleted: request.params.id });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar la categoría');
  }
});

export default router;
