-- 008_games_name_field.sql
-- Agrega campo game_name personalizable a la tabla games

ALTER TABLE games
  ADD COLUMN game_name VARCHAR(255) NULL
    COMMENT 'Nombre personalizado del partido (anula la etiqueta automática)'
    AFTER away_team_id;
