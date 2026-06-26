-- Crea la tabla pitches si no existe con el esquema completo y correcto
CREATE TABLE IF NOT EXISTS pitches (
  id              VARCHAR(36)   NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  game_id         VARCHAR(100)  NOT NULL,
  at_bat_id       VARCHAR(36)   NULL,
  pitcher_player_id VARCHAR(100) NOT NULL,
  batter_player_id  VARCHAR(100) NOT NULL,
  pitch_num       INT           NOT NULL,
  pitch_type      VARCHAR(30)   NULL,
  zone_x          INT           NULL,
  zone_y          INT           NULL,
  umpire_call     VARCHAR(20)   NOT NULL,
  inning          INT           NOT NULL,
  inning_half     VARCHAR(10)   NOT NULL,
  operator_id     VARCHAR(100)  NOT NULL,
  velocity_mph    FLOAT         NULL,
  umpire_id       VARCHAR(30)   NULL,
  video_timestamp VARCHAR(30)   NULL,
  note            TEXT          NULL,
  catcher_target_mode VARCHAR(30) NULL,
  catcher_target_col  TINYINT   NULL,
  catcher_target_row  TINYINT   NULL,
  timestamp       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_pitches_game (game_id),
  INDEX idx_pitches_at_bat (at_bat_id)
);

-- Ampliar columnas si la tabla ya existía con tamaños insuficientes
ALTER TABLE pitches
  MODIFY COLUMN inning_half VARCHAR(10) NOT NULL,
  MODIFY COLUMN umpire_call VARCHAR(20) NOT NULL,
  MODIFY COLUMN pitch_type  VARCHAR(30) NULL;
