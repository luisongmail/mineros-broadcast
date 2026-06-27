ALTER TABLE pitches
  ADD COLUMN velocity_mph    FLOAT         NULL AFTER pitch_type,
  ADD COLUMN umpire_id       VARCHAR(30)   NULL AFTER velocity_mph,
  ADD COLUMN video_timestamp VARCHAR(30)   NULL AFTER umpire_id,
  ADD COLUMN note            TEXT          NULL AFTER video_timestamp,
  ADD COLUMN catcher_target_mode VARCHAR(30) NULL AFTER note,
  ADD COLUMN catcher_target_col  TINYINT   NULL AFTER catcher_target_mode,
  ADD COLUMN catcher_target_row  TINYINT   NULL AFTER catcher_target_col;

ALTER TABLE at_bats
  ADD COLUMN hit_quality  VARCHAR(20) NULL AFTER hit_direction,
  ADD COLUMN runners_json TEXT        NULL AFTER hit_quality;
