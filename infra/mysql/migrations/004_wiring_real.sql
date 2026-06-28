-- 004_wiring_real.sql
-- Wiring real para Control Panel: estado autoritativo + auditoría + locks.

CREATE TABLE IF NOT EXISTS overlay_preview_states (
  `overlayId` VARCHAR(120) PRIMARY KEY,
  `zoneId` VARCHAR(32) NOT NULL,
  `state` JSON NOT NULL,
  `revision` BIGINT NOT NULL,
  `operatorId` VARCHAR(120) NOT NULL,
  `timestamp` DATETIME(3) NOT NULL,
  INDEX idx_overlay_preview_revision (`revision`),
  INDEX idx_overlay_preview_zone (`zoneId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS overlay_program_states (
  `overlayId` VARCHAR(120) PRIMARY KEY,
  `zoneId` VARCHAR(32) NOT NULL,
  `state` JSON NOT NULL,
  `revision` BIGINT NOT NULL,
  `operatorId` VARCHAR(120) NOT NULL,
  `timestamp` DATETIME(3) NOT NULL,
  INDEX idx_overlay_program_revision (`revision`),
  INDEX idx_overlay_program_zone (`zoneId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS overlay_locks (
  `overlayId` VARCHAR(120) PRIMARY KEY,
  `lockedBy` VARCHAR(120) NOT NULL,
  `lockedUntil` DATETIME(3) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  INDEX idx_overlay_locks_until (`lockedUntil`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS overlay_action_history (
  `actionId` VARCHAR(120) PRIMARY KEY,
  `action` VARCHAR(80) NOT NULL,
  `operatorId` VARCHAR(120) NOT NULL,
  `previewRevision` BIGINT NULL,
  `programRevision` BIGINT NULL,
  `success` BOOLEAN NOT NULL,
  `auditId` VARCHAR(120) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_overlay_history_action (`action`),
  INDEX idx_overlay_history_operator (`operatorId`),
  INDEX idx_overlay_history_created (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
