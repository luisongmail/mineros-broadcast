ALTER TABLE baserunning_events
  ADD COLUMN player_id  VARCHAR(36) NULL AFTER runner_label,
  ADD COLUMN player_num VARCHAR(10) NULL AFTER player_id;
