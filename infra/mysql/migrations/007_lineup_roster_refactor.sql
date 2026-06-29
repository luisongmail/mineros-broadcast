-- Phase 5: Lineup-Roster Refactor
-- Source spec: docs/requirements/31-Refactor - COMPLETE.md

START TRANSACTION;

-- PASO 2.0: renombrar la tabla legacy para liberar el nombre rosters
RENAME TABLE rosters TO rosters_legacy;

-- PASO 2.1: rosters (catálogo versionado por torneo/equipo)
CREATE TABLE rosters (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  tournament_id varchar(100) NOT NULL,
  team_id varchar(100) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roster_version (tournament_id, team_id, version),
  KEY idx_rosters_tournament (tournament_id),
  KEY idx_rosters_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 2.2: roster_players (membresía del roster con soft delete)
CREATE TABLE roster_players (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  roster_id varchar(36) NOT NULL,
  player_id varchar(100) NOT NULL,
  defense_position varchar(20) DEFAULT NULL,
  added_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  added_by_user_id varchar(100) DEFAULT NULL,
  removed_at datetime(3) DEFAULT NULL,
  removed_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roster_player_active (roster_id, player_id, removed_at),
  KEY idx_roster_players_roster (roster_id),
  KEY idx_roster_players_player (player_id),
  CONSTRAINT fk_roster_players_roster FOREIGN KEY (roster_id) REFERENCES rosters(id),
  CONSTRAINT fk_roster_players_player FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 2.3: roster_changes (auditoría de movimientos)
CREATE TABLE roster_changes (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  roster_id varchar(36) NOT NULL,
  player_id varchar(100) NOT NULL,
  action ENUM('added', 'removed', 'used_in_lineup') NOT NULL,
  action_date datetime(3) NOT NULL,
  action_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_roster_changes_roster (roster_id),
  KEY idx_roster_changes_player (player_id),
  KEY idx_roster_changes_date (action_date),
  CONSTRAINT fk_roster_changes_roster FOREIGN KEY (roster_id) REFERENCES rosters(id),
  CONSTRAINT fk_roster_changes_player FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 2.4: lineups (alineación por juego/equipo)
CREATE TABLE lineups (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  game_id varchar(100) NOT NULL,
  team_id varchar(100) NOT NULL,
  roster_id varchar(36) DEFAULT NULL,
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lineups_game_team (game_id, team_id),
  KEY idx_lineups_game (game_id),
  KEY idx_lineups_team (team_id),
  KEY idx_lineups_roster (roster_id),
  CONSTRAINT fk_lineups_game FOREIGN KEY (game_id) REFERENCES games(id),
  CONSTRAINT fk_lineups_roster FOREIGN KEY (roster_id) REFERENCES rosters(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 2.5: lineup_players (jugadoras/jugadores activos por lineup)
CREATE TABLE lineup_players (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  lineup_id varchar(36) NOT NULL,
  player_id varchar(100) NOT NULL,
  batting_order INT DEFAULT NULL,
  defense_position varchar(20) DEFAULT NULL,
  is_dp tinyint(1) NOT NULL DEFAULT 0,
  is_flex tinyint(1) NOT NULL DEFAULT 0,
  re_entry_used tinyint(1) NOT NULL DEFAULT 0,
  added_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  added_by_user_id varchar(100) DEFAULT NULL,
  removed_at datetime(3) DEFAULT NULL,
  removed_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_lineup_players_lineup (lineup_id),
  KEY idx_lineup_players_player (player_id),
  KEY idx_lineup_players_order (batting_order),
  CONSTRAINT fk_lineup_players_lineup FOREIGN KEY (lineup_id) REFERENCES lineups(id),
  CONSTRAINT fk_lineup_players_player FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 2.6: player_transfers (movimientos entre equipos)
CREATE TABLE player_transfers (
  id varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (UUID()),
  player_id varchar(100) NOT NULL,
  from_team_id varchar(100) NOT NULL,
  to_team_id varchar(100) NOT NULL,
  transfer_date DATE NOT NULL,
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_player_transfers_player (player_id),
  KEY idx_player_transfers_date (transfer_date),
  CONSTRAINT fk_player_transfers_player FOREIGN KEY (player_id) REFERENCES players(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PASO 3: enriquecer players con posiciones múltiples
ALTER TABLE players
  ADD COLUMN positions JSON DEFAULT NULL COMMENT 'Array de posiciones del jugador',
  ADD COLUMN primary_position varchar(20) DEFAULT NULL COMMENT 'Posición principal';

UPDATE players p
SET p.primary_position = (
  SELECT rl.position
  FROM rosters_legacy rl
  WHERE rl.player_id = p.id
    AND rl.status = 'active'
  ORDER BY rl.created_at ASC
  LIMIT 1
)
WHERE p.primary_position IS NULL;

UPDATE players
SET positions = JSON_ARRAY(COALESCE(primary_position, position, 'DH'))
WHERE positions IS NULL;

-- PASO 4.1: crear roster v1 por torneo/equipo
INSERT INTO rosters (id, tournament_id, team_id, version, created_at, created_by_user_id)
SELECT
  UUID(),
  rl.tournament_id,
  rl.team_id,
  1 AS version,
  MIN(rl.created_at) AS created_at,
  NULL AS created_by_user_id
FROM rosters_legacy rl
GROUP BY rl.tournament_id, rl.team_id;

-- PASO 4.2: migrar jugadores a roster_players
INSERT INTO roster_players (
  id, roster_id, player_id, defense_position, added_at, added_by_user_id, removed_at, removed_by_user_id
)
SELECT
  UUID(),
  r.id,
  rl.player_id,
  rl.position,
  rl.created_at,
  NULL,
  CASE WHEN rl.status = 'inactive' THEN CAST(rl.left_date AS DATETIME(3)) ELSE NULL END,
  NULL
FROM rosters_legacy rl
JOIN rosters r
  ON r.tournament_id = rl.tournament_id
 AND r.team_id = rl.team_id
 AND r.version = 1;

-- PASO 4.3: migrar auditoría inicial
INSERT INTO roster_changes (id, roster_id, player_id, action, action_date, action_by_user_id)
SELECT
  UUID(),
  r.id,
  rl.player_id,
  'added',
  rl.created_at,
  NULL
FROM rosters_legacy rl
JOIN rosters r
  ON r.tournament_id = rl.tournament_id
 AND r.team_id = rl.team_id
 AND r.version = 1
UNION ALL
SELECT
  UUID(),
  r.id,
  rl.player_id,
  'removed',
  CAST(rl.left_date AS DATETIME(3)),
  NULL
FROM rosters_legacy rl
JOIN rosters r
  ON r.tournament_id = rl.tournament_id
 AND r.team_id = rl.team_id
 AND r.version = 1
WHERE rl.status = 'inactive'
  AND rl.left_date IS NOT NULL;

-- PASO 5.1: crear lineups por game/equipo existente en at_bats
INSERT INTO lineups (id, game_id, team_id, roster_id, created_at, created_by_user_id)
SELECT
  UUID(),
  g.id,
  g.home_team_id,
  (
    SELECT r.id
    FROM rosters r
    WHERE r.team_id = g.home_team_id
    ORDER BY r.version DESC
    LIMIT 1
  ) AS roster_id,
  g.created_at,
  NULL
FROM games g
WHERE EXISTS (SELECT 1 FROM at_bats ab WHERE ab.game_id = g.id)
UNION ALL
SELECT
  UUID(),
  g.id,
  g.away_team_id,
  (
    SELECT r.id
    FROM rosters r
    WHERE r.team_id = g.away_team_id
    ORDER BY r.version DESC
    LIMIT 1
  ) AS roster_id,
  g.created_at,
  NULL
FROM games g
WHERE EXISTS (SELECT 1 FROM at_bats ab WHERE ab.game_id = g.id);

-- PASO 5.2: poblar lineup_players desde at_bats (primera aparición por bateador)
INSERT INTO lineup_players (
  id, lineup_id, player_id, batting_order, defense_position, is_dp, is_flex, re_entry_used, added_at, added_by_user_id
)
SELECT
  UUID(),
  l.id AS lineup_id,
  seed.player_id,
  seed.batting_order,
  NULL AS defense_position,
  0 AS is_dp,
  0 AS is_flex,
  0 AS re_entry_used,
  seed.first_seen_at AS added_at,
  NULL AS added_by_user_id
FROM (
  SELECT
    ab.game_id,
    ab.batting_team_id AS team_id,
    ab.batter_player_id AS player_id,
    MIN(ab.created_at) AS first_seen_at,
    ROW_NUMBER() OVER (
      PARTITION BY ab.game_id, ab.batting_team_id
      ORDER BY MIN(ab.created_at)
    ) AS batting_order
  FROM at_bats ab
  WHERE ab.batter_player_id IS NOT NULL
  GROUP BY ab.game_id, ab.batting_team_id, ab.batter_player_id
) seed
JOIN lineups l
  ON l.game_id = seed.game_id
 AND l.team_id = seed.team_id;

-- PASO 5.3: registrar jugadores usados en lineup
INSERT INTO roster_changes (id, roster_id, player_id, action, action_date, action_by_user_id)
SELECT DISTINCT
  UUID(),
  l.roster_id,
  lp.player_id,
  'used_in_lineup',
  lp.added_at,
  NULL
FROM lineup_players lp
JOIN lineups l ON l.id = lp.lineup_id
WHERE l.roster_id IS NOT NULL;

-- PASO 6: añadir referencias de lineup a games
ALTER TABLE games
  ADD COLUMN home_lineup_id varchar(36) DEFAULT NULL,
  ADD COLUMN away_lineup_id varchar(36) DEFAULT NULL,
  ADD KEY idx_games_home_lineup (home_lineup_id),
  ADD KEY idx_games_away_lineup (away_lineup_id),
  ADD CONSTRAINT fk_games_home_lineup FOREIGN KEY (home_lineup_id) REFERENCES lineups(id),
  ADD CONSTRAINT fk_games_away_lineup FOREIGN KEY (away_lineup_id) REFERENCES lineups(id);

UPDATE games g
SET
  g.home_lineup_id = (
    SELECT l.id
    FROM lineups l
    WHERE l.game_id = g.id AND l.team_id = g.home_team_id
    LIMIT 1
  ),
  g.away_lineup_id = (
    SELECT l.id
    FROM lineups l
    WHERE l.game_id = g.id AND l.team_id = g.away_team_id
    LIMIT 1
  )
WHERE EXISTS (SELECT 1 FROM lineups l WHERE l.game_id = g.id);

COMMIT;
