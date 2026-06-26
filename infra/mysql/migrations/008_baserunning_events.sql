CREATE TABLE IF NOT EXISTS baserunning_events (
  id              BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  game_id         VARCHAR(100)  NOT NULL,
  inning          INT           NOT NULL,
  inning_half     VARCHAR(10)   NOT NULL,
  event_type      VARCHAR(30)   NOT NULL,
  runner_label    VARCHAR(5)    NOT NULL,
  from_base       VARCHAR(5)    NOT NULL,
  to_base         VARCHAR(5)    NOT NULL,
  run_scored      TINYINT(1)    NOT NULL DEFAULT 0,
  earned_run      TINYINT(1)    NOT NULL DEFAULT 1,
  fielder_pos     TINYINT       NULL,
  operator_id     VARCHAR(100)  NULL,
  timestamp       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_br_game (game_id),
  INDEX idx_br_inning (game_id, inning, inning_half)
);
