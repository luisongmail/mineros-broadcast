-- PlayFlow Admin - System Policies Table
-- Stores system-wide security policies (MFA requirements, grace periods, etc.)

CREATE TABLE IF NOT EXISTS system_policies (
  policy_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  policy_name VARCHAR(128) NOT NULL UNIQUE,
  policy_content JSON NOT NULL,
  require_mfa_for_all BOOLEAN DEFAULT FALSE,
  mfa_grace_period_days INT DEFAULT 7,
  max_failed_mfa_attempts INT DEFAULT 5,
  session_timeout_minutes INT DEFAULT 30,
  require_step_up_for_admin BOOLEAN DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  updated_by CHAR(36),
  INDEX idx_policies_name (policy_name),
  INDEX idx_policies_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system policy
INSERT INTO system_policies (
  policy_name,
  policy_content,
  require_mfa_for_all,
  mfa_grace_period_days,
  max_failed_mfa_attempts,
  session_timeout_minutes,
  require_step_up_for_admin
) VALUES (
  'default',
  JSON_OBJECT(
    'requireMfaForAll', FALSE,
    'gracePeriodDays', 7,
    'maxFailedAttempts', 5,
    'sessionTimeoutMinutes', 30,
    'requireStepUpForAdmin', TRUE,
    'description', 'Default PlayFlow system policy'
  ),
  FALSE,
  7,
  5,
  30,
  TRUE
) ON DUPLICATE KEY UPDATE updated_at = NOW();
