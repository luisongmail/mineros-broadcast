-- 001_security_module.sql
-- PlayFlow Security Module v1.0
-- Target database: playflow_db

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'invited',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3),
  INDEX idx_users_status (status),
  INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS user_identities (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  provider_subject VARCHAR(255),
  email VARCHAR(255),
  metadata_json JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_identity_provider_subject (provider, provider_subject),
  INDEX idx_user_identities_user (user_id)
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_ip VARCHAR(80),
  user_agent_hash VARCHAR(128),
  INDEX idx_otp_email_status (email, status),
  INDEX idx_otp_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  auth_level VARCHAR(64) NOT NULL DEFAULT 'otp',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3),
  revoked_at DATETIME(3),
  last_seen_at DATETIME(3),
  ip VARCHAR(80),
  user_agent_hash VARCHAR(128),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_status (status)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  rotated_at DATETIME(3),
  revoked_at DATETIME(3),
  replaced_by_token_id CHAR(36),
  INDEX idx_refresh_session (session_id),
  INDEX idx_refresh_user (user_id)
);

CREATE TABLE IF NOT EXISTS role_assignments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  subject_id CHAR(36) NOT NULL,
  role VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id CHAR(36) NOT NULL,
  granted_by CHAR(36),
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  metadata_json JSON,
  UNIQUE KEY uq_role_assignment (subject_id, role, resource_type, resource_id),
  INDEX idx_role_subject (subject_id),
  INDEX idx_role_resource (resource_type, resource_id),
  INDEX idx_role_status (status)
);

CREATE TABLE IF NOT EXISTS scoring_assignments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(80) NOT NULL,
  assigned_by CHAR(36),
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_scoring_assignment (game_id, user_id, role),
  INDEX idx_scoring_game (game_id),
  INDEX idx_scoring_user (user_id),
  INDEX idx_scoring_status (status)
);

CREATE TABLE IF NOT EXISTS step_up_challenges (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  action VARCHAR(160) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id CHAR(36) NOT NULL,
  challenge_hash VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_stepup_user (user_id),
  INDEX idx_stepup_session (session_id),
  INDEX idx_stepup_resource (resource_type, resource_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actor_user_id CHAR(36),
  actor_email VARCHAR(255),
  session_id CHAR(36),
  action VARCHAR(160) NOT NULL,
  resource_type VARCHAR(80),
  resource_id CHAR(36),
  result VARCHAR(32) NOT NULL,
  decision VARCHAR(32),
  reason VARCHAR(255),
  policy_version VARCHAR(80),
  correlation_id VARCHAR(120),
  ip VARCHAR(80),
  user_agent_hash VARCHAR(128),
  change_summary TEXT,
  before_hash VARCHAR(128),
  after_hash VARCHAR(128),
  previous_hash VARCHAR(128),
  event_hash VARCHAR(128) NOT NULL,
  payload_json JSON,
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_resource (resource_type, resource_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_correlation (correlation_id)
);

CREATE TABLE IF NOT EXISTS security_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  event_type VARCHAR(120) NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'info',
  user_id CHAR(36),
  session_id CHAR(36),
  ip VARCHAR(80),
  user_agent_hash VARCHAR(128),
  details_json JSON,
  INDEX idx_security_event_type (event_type),
  INDEX idx_security_user (user_id),
  INDEX idx_security_timestamp (timestamp)
);

-- ─────────────────────────────────────────────
-- user_mfa_credentials — SysAdmin MFA (Fase 2)
-- Pendiente: decisión sobre TOTP vs passkey (§33.2)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_mfa_credentials (
  credential_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  -- 'totp' o 'passkey'
  credential_type VARCHAR(32) NOT NULL,
  -- Para TOTP: secret cifrado (AES-256 con JWT_SECRET como clave derivada)
  -- Para passkey: credentialId del WebAuthn response en base64url
  credential_data TEXT NOT NULL,
  -- Estado: 'active', 'revoked', 'pending_verification'
  status VARCHAR(32) NOT NULL DEFAULT 'pending_verification',
  -- Nombre descriptivo dado por el usuario ("Mi autenticador", "YubiKey personal")
  friendly_name VARCHAR(120),
  -- Fecha del último uso exitoso
  last_used_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_mfa_user (user_id),
  INDEX idx_mfa_status (status)
);
