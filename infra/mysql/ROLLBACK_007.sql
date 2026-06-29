-- ROLLBACK_007.sql
-- Revert lineup roster refactor changes from migration 007.

SET @has_roster_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @drop_roster_fk_sql := IF(
  @has_roster_fk = 1,
  'ALTER TABLE game_lineups DROP FOREIGN KEY fk_game_lineups_roster_id',
  'SELECT ''fk_game_lineups_roster_id already absent'''
);
PREPARE stmt FROM @drop_roster_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_courtesy_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_courtesy_running_for_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @drop_courtesy_fk_sql := IF(
  @has_courtesy_fk = 1,
  'ALTER TABLE game_lineups DROP FOREIGN KEY fk_game_lineups_courtesy_running_for_roster_id',
  'SELECT ''fk_game_lineups_courtesy_running_for_roster_id already absent'''
);
PREPARE stmt FROM @drop_courtesy_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_substituted_by_roster_fk := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_game_lineups_substituted_by_roster_id'
    AND TABLE_NAME = 'game_lineups'
);
SET @drop_substituted_by_roster_fk_sql := IF(
  @has_substituted_by_roster_fk = 1,
  'ALTER TABLE game_lineups DROP FOREIGN KEY fk_game_lineups_substituted_by_roster_id',
  'SELECT ''fk_game_lineups_substituted_by_roster_id already absent'''
);
PREPARE stmt FROM @drop_substituted_by_roster_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_active_lookup_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND INDEX_NAME = 'idx_game_lineups_active_lookup'
);
SET @drop_active_lookup_index_sql := IF(
  @has_active_lookup_index > 0,
  'DROP INDEX idx_game_lineups_active_lookup ON game_lineups',
  'SELECT ''idx_game_lineups_active_lookup already absent'''
);
PREPARE stmt FROM @drop_active_lookup_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_substituted_by_roster_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND INDEX_NAME = 'idx_game_lineups_substituted_by_roster'
);
SET @drop_substituted_by_roster_index_sql := IF(
  @has_substituted_by_roster_index > 0,
  'DROP INDEX idx_game_lineups_substituted_by_roster ON game_lineups',
  'SELECT ''idx_game_lineups_substituted_by_roster already absent'''
);
PREPARE stmt FROM @drop_substituted_by_roster_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_backup_table := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'migration_007_lineup_roster_backup'
);
SET @restore_sql := IF(
  @has_backup_table = 1,
  'UPDATE game_lineups gl INNER JOIN migration_007_lineup_roster_backup backup ON backup.lineup_id = gl.id SET gl.roster_id = backup.previous_roster_id, gl.substituted_by_roster_id = backup.previous_substituted_by_roster_id',
  'SELECT ''migration_007_lineup_roster_backup not found'''
);
PREPARE stmt FROM @restore_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_substituted_by_roster_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'game_lineups'
    AND COLUMN_NAME = 'substituted_by_roster_id'
);
SET @drop_substituted_by_roster_column_sql := IF(
  @has_substituted_by_roster_id = 1,
  'ALTER TABLE game_lineups DROP COLUMN substituted_by_roster_id',
  'SELECT ''substituted_by_roster_id already absent'''
);
PREPARE stmt FROM @drop_substituted_by_roster_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_backup_table_sql := IF(
  @has_backup_table = 1,
  'DROP TABLE migration_007_lineup_roster_backup',
  'SELECT ''migration_007_lineup_roster_backup already absent'''
);
PREPARE stmt FROM @drop_backup_table_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
