-- ============================================================
-- Migración 017 — MLBAM/WBSC Model Alignment
-- ============================================================
-- Propósito: alinear todo el modelo de datos con el estándar
--   MLBAM (MLB Stats API) y WBSC sin pérdida de datos.
--
-- Política de migración segura:
--   - SOLO ADD COLUMN IF NOT EXISTS con DEFAULT NULL (nunca DROP, nunca MODIFY sin
--     ALTER preservando tipo original)
--   - Backfills explícitos para datos derivables de columnas existentes
--   - Columnas legacy marcadas con comentario DEPRECATED — se eliminan
--     en una futura migración 018_cleanup cuando el código haya migrado
--
-- Tablas modificadas:
--   games, teams, at_bats, pitches, baserunning_events,
--   standings, game_lineups, tournaments
-- ============================================================

-- ------------------------------------------------------------
-- 1. GAMES — campos de partido MLBAM
-- ------------------------------------------------------------

-- venue_id: FK al catálogo de estadios (migration 009 creó la tabla venues)
-- Reemplaza venue VARCHAR(255) que era texto libre sin relación enforceada.
-- Estrategia: ADD venue_id NULL; backfill si existe un venue con ese nombre;
-- el campo venue VARCHAR(255) queda como DEPRECATED (no eliminar aquí).
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS venue_id VARCHAR(100) NULL
    COMMENT 'FK a venues.id — reemplaza el campo venue VARCHAR libre'
    AFTER venue;

-- Backfill: si hay registros cuyo campo venue coincide con venues.name, linkar
UPDATE games g
  JOIN venues v ON LOWER(TRIM(v.name)) = LOWER(TRIM(g.venue))
  SET g.venue_id = v.id
WHERE g.venue_id IS NULL AND g.venue IS NOT NULL AND g.venue != '';

-- game_type: código MLBAM del tipo de partido
-- R=Regular, P=Playoffs, S=Spring Training, A=All-Star, E=Exhibition, W=World Series
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_type CHAR(1) NULL
    COMMENT 'MLBAM game type: R=Regular | P=Playoffs | S=Spring | A=All-Star | E=Exhibition'
    AFTER game_name;

-- Backfill conservador: si el torneo tiene type definido podemos inferir;
-- por defecto marcamos todos como R (temporada regular) ya que es el caso
-- más común en el sistema actual. El operador puede corregir.
UPDATE games SET game_type = 'R' WHERE game_type IS NULL;

-- series_description: texto legible del tipo de serie
-- Ej: "Regular Season", "Playoffs", "Championship Series"
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS series_description VARCHAR(100) NULL
    COMMENT 'Descripción de la serie: Regular Season | Playoffs | etc.'
    AFTER game_type;

-- games_in_series: cuántos partidos tiene la serie (ej. 3, 5, 7)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS games_in_series TINYINT UNSIGNED NULL
    COMMENT 'Número total de juegos en la serie'
    AFTER series_description;

-- double_header: si es doble juego S=single/none, Y=first game, Z=second game
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS double_header CHAR(1) NULL DEFAULT 'S'
    COMMENT 'MLBAM double header: S=ninguno | Y=primer juego | Z=segundo juego'
    AFTER games_in_series;

-- Backfill: todos los partidos actuales son S (no son doble juego)
UPDATE games SET double_header = 'S' WHERE double_header IS NULL;

-- weather: snapshot de condiciones climáticas al inicio del partido (JSON MLBAM)
-- Estructura: {"condition": "Sunny", "temp": 28, "wind": "5 km/h Out to LF"}
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS weather JSON NULL
    COMMENT 'Condiciones climáticas MLBAM: {condition, temp, wind}'
    AFTER double_header;

-- ------------------------------------------------------------
-- 2. TEAMS — identificadores externos
-- ------------------------------------------------------------

-- Los jugadores tienen mlbam_id/wbsc_id (migration 014) pero los equipos no.
-- Necesario para interoperabilidad con herramientas externas.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS mlbam_id VARCHAR(20) NULL
    COMMENT 'ID del equipo en MLB Stats API'
    AFTER active;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS wbsc_id VARCHAR(30) NULL
    COMMENT 'ID del equipo en WBSC (torneos internacionales)'
    AFTER mlbam_id;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS ext_ref JSON NULL
    COMMENT 'Referencias externas adicionales {fuente: id}'
    AFTER wbsc_id;

-- team_code: código corto de transmisión MLBAM (fileCode, ej. "min", "rot")
-- Distinto de abbreviation (que es uppercase 3-4 chars para marcador)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS team_code VARCHAR(10) NULL
    COMMENT 'Código de transmisión MLBAM fileCode: ej. "min", "rot" (lowercase)'
    AFTER ext_ref;

-- Backfill: derivar team_code de abbreviation en lowercase
UPDATE teams
  SET team_code = LOWER(abbreviation)
WHERE team_code IS NULL AND abbreviation IS NOT NULL;

-- ------------------------------------------------------------
-- 3. AT_BATS — pitcher_player_id + deprecar columnas legacy
-- ------------------------------------------------------------

-- pitcher_player_id: ID directo del lanzador
-- Solo existe pitcher_roster_id (UUID del roster) que obliga a JOIN.
-- MLBAM requiere el player_id directamente en cada evento.
ALTER TABLE at_bats
  ADD COLUMN IF NOT EXISTS pitcher_player_id VARCHAR(100) NULL
    COMMENT 'player_id del lanzador — FK implícita a players.id'
    AFTER pitcher_roster_id;

-- Backfill: obtener player_id del lanzador vía rosters
UPDATE at_bats ab
  JOIN rosters r ON r.id = ab.pitcher_roster_id
  SET ab.pitcher_player_id = r.player_id
WHERE ab.pitcher_player_id IS NULL
  AND ab.pitcher_roster_id IS NOT NULL;

-- Nota sobre columnas DEPRECATED en at_bats (no se eliminan aquí):
--   result VARCHAR(50)     → reemplazado por event_type (migration 013)
--   runners_json TEXT      → reemplazado por runners JSON (migration 013)
--   player_id VARCHAR(100) → reemplazado por batter_player_id (comment en 001)
-- Estas columnas se eliminarán en migration 018_cleanup.

-- ------------------------------------------------------------
-- 4. PITCHES — deprecar columnas del modelo legacy
-- ------------------------------------------------------------

-- La migration 012 agregó plate_x/plate_z/zone/pitch_class/start_speed.
-- Las siguientes columnas del modelo original quedan DEPRECATED:
--   zone_x INT     → reemplazada por plate_x + zone (coordenadas reales)
--   zone_y INT     → reemplazada por plate_z + zone
--   pitch_type VARCHAR(20) → reemplazada por pitch_class VARCHAR(2) (código MLBAM)
--   velocity_mph FLOAT → reemplazada por start_speed DECIMAL(6,2) en km/h
--
-- No se eliminan aquí. Se eliminan en migration 018_cleanup.
--
-- Para la API, se expondrán únicamente los campos del estándar.
-- Backfill pitch_class desde pitch_type para registros que coincidan:
UPDATE pitches
  SET pitch_class = CASE LOWER(TRIM(pitch_type))
    WHEN 'recta'    THEN 'FF'
    WHEN 'fastball' THEN 'FF'
    WHEN 'cuatro costuras' THEN 'FF'
    WHEN 'four-seam' THEN 'FF'
    WHEN 'sinker'   THEN 'SI'
    WHEN 'dos costuras' THEN 'SI'
    WHEN 'two-seam' THEN 'SI'
    WHEN 'cutter'   THEN 'FC'
    WHEN 'cortada'  THEN 'FC'
    WHEN 'slider'   THEN 'SL'
    WHEN 'curveball' THEN 'CU'
    WHEN 'curva'    THEN 'CU'
    WHEN 'changeup' THEN 'CH'
    WHEN 'cambio'   THEN 'CH'
    WHEN 'splitter' THEN 'FS'
    WHEN 'knuckleball' THEN 'KN'
    WHEN 'screwball' THEN 'SC'
    WHEN 'eephus'   THEN 'EP'
    WHEN 'riseball' THEN 'RB'   -- softball
    WHEN 'dropball' THEN 'DB'   -- softball
    ELSE NULL
  END
WHERE pitch_class IS NULL
  AND pitch_type IS NOT NULL
  AND pitch_type != '';

-- Backfill start_speed desde velocity_mph (1 mph = 1.60934 km/h)
UPDATE pitches
  SET start_speed = ROUND(velocity_mph * 1.60934, 2)
WHERE start_speed IS NULL
  AND velocity_mph IS NOT NULL
  AND velocity_mph > 0;

-- ------------------------------------------------------------
-- 5. BASERUNNING_EVENTS — identidad del corredor + pitcher responsable
-- ------------------------------------------------------------

-- responsible_pitcher_id: lanzador responsable de la carrera (para ERA)
-- Necesario para calcular carreras limpias/sucias del lanzador.
ALTER TABLE baserunning_events
  ADD COLUMN IF NOT EXISTS responsible_pitcher_id VARCHAR(100) NULL
    COMMENT 'player_id del lanzador responsable de este corredor (para carrera limpia/sucia)'
    AFTER player_id;

-- scoring_team_id: equipo que anotó la carrera (cuando run_scored = 1)
ALTER TABLE baserunning_events
  ADD COLUMN IF NOT EXISTS scoring_team_id VARCHAR(100) NULL
    COMMENT 'team_id del equipo que anotó — FK implícita a teams.id'
    AFTER responsible_pitcher_id;

-- ------------------------------------------------------------
-- 6. STANDINGS — campos estándar de tabla de posiciones
-- ------------------------------------------------------------

-- GB (Games Behind): diferencia con el líder de la división/grupo
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS GB DECIMAL(4,1) NULL
    COMMENT 'Games Behind: diferencia con el líder (0.0 para el líder)'
    AFTER `Dif`;

-- streak: racha actual (ej. W5 = ganando 5, L2 = perdiendo 2)
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS streak VARCHAR(10) NULL
    COMMENT 'Racha actual: W{n} = ganando n, L{n} = perdiendo n'
    AFTER GB;

-- L10: record en los últimos 10 partidos "W-L" (ej. "7-3")
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS L10 VARCHAR(10) NULL
    COMMENT 'Record en los últimos 10 partidos (ej. 7-3)'
    AFTER streak;

-- home_record: record en partidos en casa "W-L"
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS home_record VARCHAR(10) NULL
    COMMENT 'Record de local (ej. 12-5)'
    AFTER L10;

-- away_record: record en partidos de visitante "W-L"
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS away_record VARCHAR(10) NULL
    COMMENT 'Record de visitante (ej. 8-9)'
    AFTER home_record;

-- elimination_number: número de la eliminación (EN)
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS elimination_number SMALLINT NULL
    COMMENT 'Número de eliminación: partidos que necesita perder para quedar eliminado'
    AFTER away_record;

-- magic_number: número mágico del líder para ganar la división
ALTER TABLE standings
  ADD COLUMN IF NOT EXISTS magic_number SMALLINT NULL
    COMMENT 'Número mágico del líder para ganar la serie'
    AFTER elimination_number;

-- ------------------------------------------------------------
-- 7. GAME_LINEUPS — posición defensiva separada de posición de batting
-- ------------------------------------------------------------

-- En béisbol, un jugador puede ser DH (batea) pero la posición defensiva
-- es diferente (el que entra por él en el campo). MLBAM distingue ambos.
ALTER TABLE game_lineups
  ADD COLUMN IF NOT EXISTS defensive_position VARCHAR(20) NULL
    COMMENT 'Posición defensiva en campo (puede diferir del rol de batting en DH/Flex)'
    AFTER position;

-- Backfill: en la mayoría de casos la posición defensiva = position
UPDATE game_lineups
  SET defensive_position = position
WHERE defensive_position IS NULL
  AND is_dp = 0;   -- el DP batea pero la posición defensiva es del Flex

-- ------------------------------------------------------------
-- 8. TOURNAMENTS — identificadores externos
-- ------------------------------------------------------------

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS mlbam_id VARCHAR(20) NULL
    COMMENT 'ID del torneo en MLB Stats API (para torneos con referencia MLB)'
    AFTER status;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS wbsc_id VARCHAR(30) NULL
    COMMENT 'ID del torneo en WBSC'
    AFTER mlbam_id;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS ext_ref JSON NULL
    COMMENT 'Referencias externas adicionales {fuente: id}'
    AFTER wbsc_id;

-- ------------------------------------------------------------
-- 9. LEAGUES — identificadores externos
-- ------------------------------------------------------------

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS mlbam_id VARCHAR(20) NULL
    COMMENT 'ID de la liga en MLB Stats API'
    AFTER active;

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS wbsc_id VARCHAR(30) NULL
    COMMENT 'ID de la liga en WBSC'
    AFTER mlbam_id;

-- ------------------------------------------------------------
-- FIN DE MIGRACIÓN 017
-- ============================================================
-- Columnas DEPRECATED pendientes de eliminar en migration 018:
--
--   at_bats.result              → reemplazada por at_bats.event_type
--   at_bats.runners_json        → reemplazada por at_bats.runners
--   at_bats.player_id           → reemplazada por at_bats.batter_player_id
--   pitches.zone_x              → reemplazada por pitches.plate_x + zone
--   pitches.zone_y              → reemplazada por pitches.plate_z + zone
--   pitches.pitch_type          → reemplazada por pitches.pitch_class
--   pitches.velocity_mph        → reemplazada por pitches.start_speed (km/h)
--   games.venue                 → reemplazada por games.venue_id
-- ============================================================
