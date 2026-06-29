-- Rollback Phase 5 migration 007_lineup_roster_refactor.sql
-- Uso: mysql <db> < infra/mysql/ROLLBACK_007.sql

START TRANSACTION;

ALTER TABLE games DROP FOREIGN KEY fk_games_home_lineup;
ALTER TABLE games DROP FOREIGN KEY fk_games_away_lineup;
ALTER TABLE games DROP INDEX idx_games_home_lineup;
ALTER TABLE games DROP INDEX idx_games_away_lineup;
ALTER TABLE games DROP COLUMN home_lineup_id;
ALTER TABLE games DROP COLUMN away_lineup_id;

DROP TABLE IF EXISTS player_transfers;
DROP TABLE IF EXISTS lineup_players;
DROP TABLE IF EXISTS lineups;
DROP TABLE IF EXISTS roster_changes;
DROP TABLE IF EXISTS roster_players;
DROP TABLE IF EXISTS rosters;

ALTER TABLE players DROP COLUMN positions;
ALTER TABLE players DROP COLUMN primary_position;

RENAME TABLE rosters_legacy TO rosters;

COMMIT;
