ALTER TABLE at_bats
  ADD COLUMN contact_type VARCHAR(30) NULL AFTER notes,
  ADD COLUMN hit_direction VARCHAR(10) NULL AFTER contact_type;
