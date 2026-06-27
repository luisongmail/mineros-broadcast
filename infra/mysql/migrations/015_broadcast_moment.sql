-- 015 — Broadcast Moment
-- Agrega outs_before y video_timestamp a todas las tablas de eventos
-- para registrar el momento exacto de la transmisión en que ocurrió cada play.
--
-- outs_before: outs en el juego al inicio del play (0, 1 o 2).
--              Permite contextualizar el play dentro de la media entrada.
-- video_timestamp: timecode del stream (ej. "1:23:45.500") para sincronizar
--                  datos con el video de la transmisión.
-- score_home/score_away: marcador al momento del play (snapshot de contexto).
--
-- NOTA: MySQL 8.0 no soporta ADD COLUMN IF NOT EXISTS con columnas múltiples;
--       se aplican como sentencias separadas.

ALTER TABLE at_bats
  ADD COLUMN outs_before     TINYINT(1)  NULL COMMENT 'outs al inicio del at-bat (0-2)';
ALTER TABLE at_bats
  ADD COLUMN score_home      INT         NULL COMMENT 'marcador local al inicio del at-bat';
ALTER TABLE at_bats
  ADD COLUMN score_away      INT         NULL COMMENT 'marcador visitante al inicio del at-bat';
ALTER TABLE at_bats
  ADD COLUMN video_timestamp VARCHAR(30) NULL COMMENT 'timecode del stream HH:MM:SS.mmm';

ALTER TABLE baserunning_events
  ADD COLUMN outs_before     TINYINT(1)  NULL COMMENT 'outs al momento del evento de corredor';
ALTER TABLE baserunning_events
  ADD COLUMN video_timestamp VARCHAR(30) NULL COMMENT 'timecode del stream HH:MM:SS.mmm';

ALTER TABLE game_events
  ADD COLUMN outs_before     TINYINT(1)  NULL COMMENT 'outs al momento del evento';
ALTER TABLE game_events
  ADD COLUMN score_home      INT         NULL COMMENT 'marcador local al momento del evento';
ALTER TABLE game_events
  ADD COLUMN score_away      INT         NULL COMMENT 'marcador visitante al momento del evento';
ALTER TABLE game_events
  ADD COLUMN video_timestamp VARCHAR(30) NULL COMMENT 'timecode del stream HH:MM:SS.mmm';

-- pitches: ya tiene video_timestamp; agregar outs_before
ALTER TABLE pitches
  ADD COLUMN outs_before     TINYINT(1)  NULL COMMENT 'outs al momento del lanzamiento';
