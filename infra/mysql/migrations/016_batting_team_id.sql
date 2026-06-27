-- 016 — batting_team_id en at_bats
-- Agrega el identificador explícito del equipo al bate en cada at-bat.
-- Requerido por el estándar MLBAM: battingTeam es un campo propio del evento,
-- no derivado de inning_half.
-- top = visitante (away) al bate → batting_team_id = away_team_id del juego
-- bottom = local (home) al bate  → batting_team_id = home_team_id del juego

ALTER TABLE at_bats
  ADD COLUMN batting_team_id VARCHAR(100) NULL
    COMMENT 'equipo al bate — FK implícita a teams.id (MLBAM: battingTeam)';

-- Backfill para registros existentes usando inning_half + game_configurations
UPDATE at_bats ab
  JOIN games g ON g.id = ab.game_id
  SET ab.batting_team_id = CASE
    WHEN ab.inning_half = 'bottom' THEN g.home_team_id
    ELSE g.away_team_id
  END
WHERE ab.batting_team_id IS NULL
  AND ab.inning_half IS NOT NULL;
