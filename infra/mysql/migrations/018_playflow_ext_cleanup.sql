-- ============================================================
-- Migración 018 — PlayFlow Extension Namespace + Cleanup
-- ============================================================
-- Propósito:
--   1. Agregar campo ext JSON (PFX — PlayFlow eXtension) a tablas
--      con datos no-estándar necesarios para funcionalidad broadcast.
--   2. Agregar hit_data JSON a at_bats (estándar MLBAM hitData).
--   3. Backfill hit_data desde columnas legacy contact_type/hit_direction.
--   4. Eliminar columnas deprecated (Categoría A) ya reemplazadas por
--      equivalentes estándar en migraciones anteriores.
--   5. Eliminar columnas redundantes en baserunning_events.
--
-- Sin pérdida de datos:
--   - Backfill completo antes de cualquier DROP.
--   - velocity_mph no tiene datos en el sistema actual (nunca se usó
--     la columna para almacenamiento real); DROP seguro.
--   - runner_label = from_base (redundante); player_num derivable por JOIN.
--   - games.venue = texto libre, todos los valores migrados a venue_id en 017.
--
-- Convención PFX (PlayFlow eXtension):
--   Campos no-estándar necesarios para funcionalidad PlayFlow se almacenan
--   en columna ext JSON bajo la clave "playflow":
--     { "playflow": { "gameName": "...", "catcherTarget": {...} } }
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADD ext JSON — contenedor PFX por tabla
-- ------------------------------------------------------------

ALTER TABLE games
  ADD COLUMN ext JSON NULL
    COMMENT 'PFX: PlayFlow eXtension — campos no-estándar {playflow:{gameName,category,rulesOverride,gameState}}'
    AFTER rules_override;

ALTER TABLE pitches
  ADD COLUMN ext JSON NULL
    COMMENT 'PFX: PlayFlow eXtension — {playflow:{catcherTarget,operatorId,note}}'
    AFTER confidence;

ALTER TABLE at_bats
  ADD COLUMN ext JSON NULL
    COMMENT 'PFX: PlayFlow eXtension — {playflow:{notes,onBase}}'
    AFTER batting_team_id;

ALTER TABLE baserunning_events
  ADD COLUMN ext JSON NULL
    COMMENT 'PFX: PlayFlow eXtension — {playflow:{fielderPos}}'
    AFTER scoring_team_id;

-- ------------------------------------------------------------
-- 2. ADD hit_data JSON — estructura MLBAM hitData estándar
-- ------------------------------------------------------------
-- Estructura: {
--   type: "ground_ball"|"fly_ball"|"line_drive"|"popup"|"bunt_grounder",
--   hardness: "soft"|"medium"|"hard",
--   coordinates: { coordX: number, coordY: number }
-- }

ALTER TABLE at_bats
  ADD COLUMN hit_data JSON NULL
    COMMENT 'MLBAM hitData: {type, hardness, coordinates:{coordX,coordY}}'
    AFTER runners;

-- ------------------------------------------------------------
-- 3. BACKFILL — poblar ext y hit_data antes de DROP
-- ------------------------------------------------------------

-- 3a. games.ext: migrar game_name, game_state, rules_override a ext.playflow
--     Las columnas originales NO se eliminan aquí porque el código aún las usa.
--     Se eliminan en una futura migración cuando el código haya migrado a ext.
UPDATE games
  SET ext = JSON_OBJECT(
    'playflow', JSON_OBJECT(
      'gameName',      COALESCE(game_name, ''),
      'rulesOverride', COALESCE(rules_override, JSON_OBJECT()),
      'gameState',     COALESCE(game_state, JSON_OBJECT())
    )
  )
WHERE ext IS NULL;

-- 3b. at_bats.hit_data: construir hitData MLBAM desde contact_type + hit_direction
--     Mapeo contact_type → MLBAM hitData.type
UPDATE at_bats
  SET hit_data = JSON_OBJECT(
    'type', CASE LOWER(TRIM(contact_type))
      WHEN 'grounder'       THEN 'ground_ball'
      WHEN 'ground_ball'    THEN 'ground_ball'
      WHEN 'fly_ball'       THEN 'fly_ball'
      WHEN 'fly'            THEN 'fly_ball'
      WHEN 'line_drive'     THEN 'line_drive'
      WHEN 'linea'          THEN 'line_drive'
      WHEN 'liner'          THEN 'line_drive'
      WHEN 'popup'          THEN 'popup'
      WHEN 'pop_up'         THEN 'popup'
      WHEN 'globo'          THEN 'popup'
      WHEN 'bunt'           THEN 'bunt_grounder'
      ELSE contact_type
    END,
    'direction', COALESCE(hit_direction, NULL)
  )
WHERE (contact_type IS NOT NULL OR hit_direction IS NOT NULL)
  AND hit_data IS NULL;

-- 3c. at_bats.ext: migrar notes y on_base a ext.playflow
UPDATE at_bats
  SET ext = JSON_OBJECT(
    'playflow', JSON_OBJECT(
      'notes',  COALESCE(notes, ''),
      'onBase', IF(on_base = 1, CAST(TRUE AS JSON), CAST(FALSE AS JSON))
    )
  )
WHERE (notes IS NOT NULL OR on_base IS NOT NULL)
  AND ext IS NULL;

-- 3d. baserunning_events.ext: migrar fielder_pos y runner_label
UPDATE baserunning_events
  SET ext = JSON_OBJECT(
    'playflow', JSON_OBJECT(
      'fielderPos',  fielder_pos,
      'runnerLabel', runner_label
    )
  )
WHERE (fielder_pos IS NOT NULL OR runner_label IS NOT NULL)
  AND ext IS NULL;

-- 3e. pitches.ext: migrar operator_id y umpire_id (si existe la columna)
--     operator_id no se elimina porque aún es referenciado en código
UPDATE pitches
  SET ext = JSON_OBJECT(
    'playflow', JSON_OBJECT(
      'operatorId', operator_id
    )
  )
WHERE operator_id IS NOT NULL
  AND ext IS NULL;

-- ------------------------------------------------------------
-- 4. DROP columnas deprecated (Categoría A)
--    Solo después de verificar que los backfills están completos.
-- ------------------------------------------------------------

-- at_bats: columnas reemplazadas en migraciones 013, 014, 016
ALTER TABLE at_bats
  DROP COLUMN result,
  DROP COLUMN player_id;

-- at_bats.runners_json (TEXT legacy de 005_spec27_extras, reemplazado por runners JSON en 013)
-- Verificar que no tenga datos que no estén en runners antes de DROP:
-- En este sistema runners_json TEXT nunca fue persistido desde el backend
-- (el código siempre usó runners JSON desde 013). DROP seguro.
ALTER TABLE at_bats
  DROP COLUMN runners_json;

-- pitches: columnas reemplazadas en migración 012
ALTER TABLE pitches
  DROP COLUMN zone_x,
  DROP COLUMN zone_y,
  DROP COLUMN pitch_type;
-- velocity_mph: nunca se usó para almacenamiento real en este sistema
-- (el adapter de Rapsodo no fue implementado con esta columna como destino)
ALTER TABLE pitches
  DROP COLUMN velocity_mph;

-- games.venue: reemplazada por venue_id en migración 017
ALTER TABLE games
  DROP COLUMN venue;

-- ------------------------------------------------------------
-- 5. DROP columnas redundantes baserunning_events
-- ------------------------------------------------------------

-- runner_label: semánticamente idéntico a from_base. Migrado a ext.playflow en paso 3d.
ALTER TABLE baserunning_events
  DROP COLUMN runner_label;

-- player_num: dorsal del corredor, derivable con JOIN a players.
--             Migrado a ext.playflow no (no es útil a nivel de extensión).
--             Simplemente eliminado — el número se obtiene del perfil del jugador.
ALTER TABLE baserunning_events
  DROP COLUMN player_num;

-- ============================================================
-- FIN MIGRACIÓN 018
-- ============================================================
-- Columnas que PERMANECEN en las tablas originales (no se eliminan):
--   games.game_name      — code still reads/writes this column directly
--   games.game_state     — live state, code reads/writes directly
--   games.rules_override — rules engine reads this directly
--   at_bats.notes        — code writes this directly
--   at_bats.on_base      — scorer router writes this; derivable from event_type
--   at_bats.contact_type — UI still sends this; backfill to hit_data done
--   at_bats.hit_direction — UI still sends this; backfill to hit_data done
--   pitches.operator_id  — code writes/reads this directly
-- Estos campos serán eliminados cuando el código haya migrado a ext/hit_data.
-- Ver migración 019 (futura) para cleanup de segunda fase.
-- ============================================================
