-- 2026-06-27
-- PlayFlow MLBAM compliance gap fields for at_bats, pitches, and game_events

ALTER TABLE `at_bats`
  ADD COLUMN `earned_runs` INT NOT NULL DEFAULT 0 COMMENT 'MLBAM earnedRuns — carreras limpias del turno',
  ADD COLUMN `unearned_runs` INT NOT NULL DEFAULT 0 COMMENT 'MLBAM unearnedRuns — carreras sucias del turno',
  ADD COLUMN `is_plate_appearance` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'MLBAM isPlateAppearance — 0 para sac_bunt, interference',
  ADD COLUMN `is_at_bat` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'MLBAM isAtBat — 0 para walk, HBP, sac_fly, sac_bunt',
  ADD COLUMN `substitution_type` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'pinch_hitter | pinch_runner | null=regular';

ALTER TABLE `pitches`
  ADD COLUMN `pitch_type` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'MLBAM pitchType — FF/SL/CU/CH/etc';

ALTER TABLE `game_events`
  ADD COLUMN `sequence` INT NOT NULL DEFAULT 0 COMMENT 'Orden secuencial del evento en el juego — para reconstrucción',
  ADD COLUMN `context_before` JSON NULL COMMENT 'Estado del juego ANTES del evento (bases, score, outs, count)',
  ADD COLUMN `context_after` JSON NULL COMMENT 'Estado del juego DESPUÉS del evento (bases, score, outs)',
  ADD COLUMN `review_status` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed' COMMENT 'confirmed | pending_review | corrected';

UPDATE `at_bats`
SET `is_at_bat` = 0
WHERE `event_type` IN ('walk', 'hit_by_pitch', 'sac_fly', 'sac_bunt');

UPDATE `at_bats`
SET `is_plate_appearance` = 0
WHERE `event_type` = 'sac_bunt';
