// security-contracts-v1.ts
// PlayFlow Security Module v1.0

export type AuthLevel = 'anonymous' | 'otp' | 'mfa' | 'step_up';
export type AuthorizationDecisionValue = 'allow' | 'deny';

export interface UserSecurityProfile {
  userId: string;
  email: string;
  displayName: string;
  globalRoles: string[];
  authLevel: AuthLevel;
  sessionId: string;
}

export interface ResourceRef {
  type: string;
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

export interface SecurityContext {
  user: UserSecurityProfile;
  availableScopes: Array<{
    resourceType: string;
    resourceId: string;
    name: string;
    role: string;
  }>;
  securityFlags: {
    requiresStepUpForSensitiveActions: boolean;
    canViewAudit: boolean;
    isSysAdmin: boolean;
  };
}

export interface RoleAssignment {
  assignmentId: string;
  subjectId: string;
  role: string;
  resourceType: string;
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
