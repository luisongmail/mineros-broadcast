-- 007_lineup_roster_refactor.sql
-- Backfill roster references in game_lineups and add reversible integrity helpers.

SET @has_substituted_by_roster_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND COLUMN_NAME = 'substituted_by_roster_id'
);

SET @add_substituted_by_roster_sql := IF(
  @has_substituted_by_roster_id = 0,
  'ALTER TABLE game_lineups ADD COLUMN substituted_by_roster_id VARCHAR(36) NULL AFTER substituted_at',
  'SELECT ''substituted_by_roster_id already exists'''
);
PREPARE stmt FROM @add_substituted_by_roster_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS migration_007_lineup_roster_backup (
  lineup_id VARCHAR(36) NOT NULL,
  previous_roster_id VARCHAR(36) NULL,
  previous_substituted_by_roster_id VARCHAR(36) NULL,
  captured_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (lineup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migration_007_lineup_roster_backup (
  lineup_id,
  previous_roster_id,
  previous_substituted_by_roster_id
)
SELECT
  gl.id,
  gl.roster_id,
  gl.substituted_by_roster_id
FROM game_lineups gl
LEFT JOIN migration_007_lineup_roster_backup backup
  ON backup.lineup_id = gl.id
WHERE backup.lineup_id IS NULL;

UPDATE game_lineups gl
INNER JOIN games g
  ON g.id = gl.game_id
INNER JOIN rosters r
  ON r.tournament_id = g.tournament_id
 AND r.team_id = gl.team_id
 AND r.player_id = gl.player_id
SET gl.roster_id = r.id
WHERE gl.roster_id IS NULL;

UPDATE game_lineups gl
INNER JOIN games g
  ON g.id = gl.game_id
INNER JOIN rosters r
  ON r.tournament_id = g.tournament_id
 AND r.team_id = gl.team_id
 AND r.player_id = gl.substituted_by
SET gl.substituted_by_roster_id = r.id
WHERE gl.substituted_by IS NOT NULL
  AND gl.substituted_by_roster_id IS NULL;

SET @has_active_lookup_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND INDEX_NAME = 'idx_game_lineups_active_lookup'
);
SET @add_active_lookup_index_sql := IF(
  @has_active_lookup_index = 0,
  'CREATE INDEX idx_game_lineups_active_lookup ON game_lineups (game_id, team_id, substituted_at, batting_order)',
  'SELECT ''idx_game_lineups_active_lookup already exists'''
);
PREPARE stmt FROM @add_active_lookup_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_substituted_by_roster_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND INDEX_NAME = 'idx_game_lineups_substituted_by_roster'
);
SET @add_substituted_by_roster_index_sql := IF(
  @has_substituted_by_roster_index = 0,
  'CREATE INDEX idx_game_lineups_substituted_by_roster ON game_lineups (substituted_by_roster_id)',
  'SELECT ''idx_game_lineups_substituted_by_roster already exists'''
);
PREPARE stmt FROM @add_substituted_by_roster_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_roster_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @add_roster_fk_sql := IF(
  @has_roster_fk = 0,
  'ALTER TABLE game_lineups ADD CONSTRAINT fk_game_lineups_roster_id FOREIGN KEY (roster_id) REFERENCES rosters (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_game_lineups_roster_id already exists'''
);
PREPARE stmt FROM @add_roster_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_courtesy_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_courtesy_running_for_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @add_courtesy_fk_sql := IF(
  @has_courtesy_fk = 0,
  'ALTER TABLE game_lineups ADD CONSTRAINT fk_game_lineups_courtesy_running_for_roster_id FOREIGN KEY (courtesy_running_for_roster_id) REFERENCES rosters (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_game_lineups_courtesy_running_for_roster_id already exists'''
);
PREPARE stmt FROM @add_courtesy_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_substituted_by_roster_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_substituted_by_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @add_substituted_by_roster_fk_sql := IF(
  @has_substituted_by_roster_fk = 0,
  'ALTER TABLE game_lineups ADD CONSTRAINT fk_game_lineups_substituted_by_roster_id FOREIGN KEY (substituted_by_roster_id) REFERENCES rosters (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''fk_game_lineups_substituted_by_roster_id already exists'''
);
PREPARE stmt FROM @add_substituted_by_roster_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
