ALTER TABLE pitches
  ADD COLUMN IF NOT EXISTS velocity_mph    FLOAT         NULL AFTER pitch_type,
  ADD COLUMN IF NOT EXISTS umpire_id       VARCHAR(30)   NULL AFTER velocity_mph,
  ADD COLUMN IF NOT EXISTS video_timestamp VARCHAR(30)   NULL AFTER umpire_id,
  ADD COLUMN IF NOT EXISTS note            TEXT          NULL AFTER video_timestamp,
  ADD COLUMN IF NOT EXISTS catcher_target_mode VARCHAR(30) NULL AFTER note,
  ADD COLUMN IF NOT EXISTS catcher_target_col  TINYINT   NULL AFTER catcher_target_mode,
  ADD COLUMN IF NOT EXISTS catcher_target_row  TINYINT   NULL AFTER catcher_target_col;

ALTER TABLE at_bats
  ADD COLUMN IF NOT EXISTS hit_quality  VARCHAR(20) NULL AFTER hit_direction,
  ADD COLUMN IF NOT EXISTS runners_json TEXT        NULL AFTER hit_quality;
