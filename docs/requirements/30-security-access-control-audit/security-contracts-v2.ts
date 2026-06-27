// security-contracts-v2.ts
// PlayFlow Security Module v2.0
// Aprobado 2026-06-27 — Incorpora decisiones #1-#5

// ─────────────────────────────────────────────
// Enums y union types base
// ─────────────────────────────────────────────

export type AuthLevel = 'anonymous' | 'otp' | 'mfa' | 'step_up';
export type AuthorizationDecisionValue = 'allow' | 'deny';

/** Los 27 tipos de recurso del sistema, según la política security-policy-v1.0.0.json */
export type ResourceType =
  | 'Platform'
  | 'Organization'
  | 'League'
  | 'Season'
  | 'Tournament'
  | 'Division'
  | 'Conference'
  | 'Team'
  | 'Game'
  | 'GameDay'
  | 'Match'
  | 'Event'
  | 'Player'
  | 'Roster'
  | 'Position'
  | 'Stat'
  | 'StandingStat'
  | 'Bracket'
  | 'Venue'
  | 'Media'
  | 'Broadcast'
  | 'Flow'
  | 'Overlay'
  | 'Report'
  | 'Audit'
  | 'Notification'
  | 'ScoringAssignment';

/** Representa el scope (contexto) activo que el usuario seleccionó en /auth/select-scope */
export interface ResourceScope {
  resourceType: ResourceType;
  resourceId: string;
  /** Nombre legible para mostrar en la UI */
  name: string;
  /** Rol del usuario en este recurso */
  role: string;
  /** Descripción del rol para la UI */
  description?: string;
}

/** Header que transporta el step-up token hacia las acciones críticas */
export const STEP_UP_HEADER = 'X-Step-Up-Token' as const;

// ─────────────────────────────────────────────
// Códigos de error de auth
// ─────────────────────────────────────────────

export type AuthErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_OTP'
  | 'OTP_MAX_ATTEMPTS'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_REUSE'
  | 'UNAUTHENTICATED'
  | 'STEP_UP_NOT_REQUIRED'
  | 'INVALID_STEP_UP_CODE'
  | 'CHALLENGE_ALREADY_CONSUMED'
  | 'MISSING_TOKEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error: {
    code: AuthErrorCode;
    message: string;
    /** Solo presente en RATE_LIMIT_EXCEEDED — segundos hasta poder reintentar */
    retryAfter?: number;
  };
}

// ─────────────────────────────────────────────
// Request types — auth endpoints
// ─────────────────────────────────────────────

export interface OtpRequestBody {
  email: string;
}

export interface OtpVerifyBody {
  email: string;
  otp: string;
}

export interface MagicLinkRequestBody {
  email: string;
  redirectUrl?: string;
}

export interface StepUpRequestBody {
  action: string;
  resourceType: ResourceType;
  resourceId: string;
}

export interface StepUpVerifyBody {
  challengeId: string;
  code: string;
  /** Obligatorio si la política indica requiresReason: true para la acción */
  reason?: string;
}

export interface RoleAssignmentCreateBody {
  userId: string;
  role: string;
  resourceType: ResourceType;
  resourceId: string;
  expiresAt?: string | null;
}

export interface ScoringAssignmentCreateBody {
  userId: string;
  role: 'official_scorer' | 'assistant_scorer' | 'reviewer';
}

export interface AuthorizationSimulateBody {
  userId: string;
  action: string;
  resourceType: ResourceType;
  resourceId: string;
}

// ─────────────────────────────────────────────
// Response types — auth endpoints
// ─────────────────────────────────────────────

/** Respuesta de POST /api/auth/otp/verify y POST /api/auth/token/refresh */
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Segundos hasta expirar el access token */
  expiresIn: number;
  /** Solo presente en /otp/verify (no en /token/refresh) */
  sessionId?: string;
}

/** Respuesta de POST /api/auth/step-up/request */
export interface StepUpChallengeResponse {
  challengeId: string;
  expiresAt: string;
  method: 'otp';
  action: string;
  resourceType: ResourceType;
  resourceId: string;
}

/** Respuesta de POST /api/auth/step-up/verify */
export interface StepUpTokenResponse {
  stepUpToken: string;
  expiresAt: string;
  action: string;
  resourceType: ResourceType;
  resourceId: string;
}

/** Respuesta de GET /api/security/context */
export interface SecurityContextResponse {
  user: UserSecurityProfile;
  availableScopes: ResourceScope[];
  securityFlags: {
    requiresStepUpForSensitiveActions: boolean;
    canViewAudit: boolean;
    isSysAdmin: boolean;
  };
}

/** Respuesta de POST /api/admin/access/simulate */
export interface AuthorizationSimulateResponse {
  decision: AuthorizationDecisionValue;
  reason: string;
  policyVersion: string;
  requiresStepUp?: boolean;
  requiresReason?: boolean;
}

/** Respuesta de POST /api/auth/otp/request y /api/auth/magic-link/request (no-enumeración) */
export interface NoEnumerationResponse {
  message: string;
}

// ─────────────────────────────────────────────
// Tipos de perfil y contexto (v1 compatibles, sin breaking changes)
// ─────────────────────────────────────────────

export interface UserSecurityProfile {
  userId: string;
  email: string;
  displayName: string;
  globalRoles: string[];
  authLevel: AuthLevel;
  sessionId: string;
}

export interface ResourceRef {
  type: ResourceType;
  id: string;
}

export interface AuthorizationSubject {
  userId: string;
  sessionId: string;
  authLevel: AuthLevel;
}

export interface AuthorizationRequest {
  subject: AuthorizationSubject;
  action: string;
  resource: ResourceRef;
  context?: Record<string, unknown>;
}

export interface AuthorizationDecision {
  allowed: boolean;
  decision: AuthorizationDecisionValue;
  reason: string;
  policyVersion: string;
  requiresStepUp?: boolean;
  requiresReason?: boolean;
}

export interface CapabilityResponse {
  resource: ResourceRef;
  user: {
    userId: string;
    authLevel: AuthLevel;
  };
  effectiveRoles: string[];
  capabilities: Record<string, boolean>;
  requirements: Record<string, {
    requiresStepUp?: boolean;
    requiresReason?: boolean;
  }>;
  explanations: Record<string, string>;
}

export interface RoleAssignment {
  assignmentId: string;
  subjectId: string;
  role: string;
  resourceType: ResourceType;
  resourceId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string | null;
  status: 'active' | 'pending' | 'revoked' | 'expired';
}

export interface ScoringAssignment {
  assignmentId: string;
  gameId: string;
  userId: string;
  role: 'official_scorer' | 'assistant_scorer' | 'reviewer';
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'revoked';
}

export interface AuditEvent {
  auditId: string;
  timestamp: string;
  actor: {
    userId?: string;
    email?: string;
    sessionId?: string;
    authMethod?: string;
    authLevel?: AuthLevel;
  };
  action: string;
  resource: ResourceRef;
  result: 'allowed' | 'denied' | 'failed';
  authorization?: {
    decision: AuthorizationDecisionValue;
    reason: string;
    policyVersion: string;
  };
  request?: {
    ip?: string;
    userAgent?: string;
    correlationId?: string;
  };
  change?: {
    beforeHash?: string;
    afterHash?: string;
    summary?: string;
  };
  integrity: {
    eventHash: string;
    previousHash?: string;
  };
}

// ─────────────────────────────────────────────
// SecurityContextProvider — contrato para el contexto React
// ─────────────────────────────────────────────

/**
 * Contrato del contexto de seguridad disponible en toda la UI.
 * El access token (JWT) vive en memoria dentro de este provider — nunca en localStorage.
 * El step-up token también vive en memoria y se descarta tras ser usado.
 */
export interface SecurityContextValue {
  /** Perfil del usuario autenticado, null si no hay sesión */
  user: UserSecurityProfile | null;
  /** Scope activo seleccionado en /auth/select-scope */
  currentScope: ResourceScope | null;
  /** Lista de scopes disponibles para el usuario */
  availableScopes: ResourceScope[];
  /** Flags de permisos rápidos para la UI */
  securityFlags: {
    requiresStepUpForSensitiveActions: boolean;
    canViewAudit: boolean;
    isSysAdmin: boolean;
  } | null;
  /** true mientras se valida el token al cargar la página */
  loading: boolean;
  /** Step-up token activo (en memoria, un solo uso) */
  stepUpToken: string | null;
  /** Cambia el scope activo del usuario */
  setScope: (scope: ResourceScope) => void;
  /** Limpia el scope activo (vuelve a la pantalla de selección) */
  clearScope: () => void;
  /** Guarda el step-up token recibido de /api/auth/step-up/verify */
  setStepUpToken: (token: string) => void;
  /** Descarta el step-up token (se llama después de usarlo en una acción crítica) */
  clearStepUpToken: () => void;
  /** Cierra la sesión: revoca refresh token, limpia JWT en memoria */
  logout: () => Promise<void>;
}
