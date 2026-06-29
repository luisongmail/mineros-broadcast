/**
 * useAdmin.ts
 * Custom hook for admin panel API operations
 * Centralizes all admin API calls with error handling and loading state
 */

import { useState, useCallback } from 'react';

export interface AdminError {
  code: string;
  message: string;
}

// ────────────────────────────────────────────
// Policy Types
// ────────────────────────────────────────────

export interface MfaPolicy {
  requireMfaForAll: boolean;
  gracePeriodDays: number;
  stepUpExpiryMinutes: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

// ────────────────────────────────────────────
// User Types
// ────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'inactive';
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
}

// ────────────────────────────────────────────
// Audit Types
// ────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  action: string;
  result: 'allowed' | 'denied';
  actor: string;
  resource: string;
  timestamp: string;
  details: Record<string, unknown>;
}

// ────────────────────────────────────────────
// Session Types
// ────────────────────────────────────────────

export interface AdminSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

// ────────────────────────────────────────────
// Health Types
// ────────────────────────────────────────────

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  db: 'connected' | 'not_configured';
}

// ────────────────────────────────────────────
// Hook Implementation
// ────────────────────────────────────────────

export function useAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ────────────────────────────────────────────
  // Policy API
  // ────────────────────────────────────────────

  const updatePolicy = useCallback(async (policy: Partial<MfaPolicy>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/policy/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyName: 'mfa_policy',
          policyContent: policy,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw { code: 'POLICY_UPDATE_FAILED', message: data.error || 'Failed to update policy' };
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const adminError: AdminError = err instanceof Error 
        ? { code: 'POLICY_UPDATE_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      throw adminError;
    } finally {
      setLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────
  // User API
  // ────────────────────────────────────────────

  const getUsers = useCallback(async (): Promise<AdminUser[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'USERS_FETCH_FAILED', message: 'Failed to load users' };
      }

      const data = await response.json();
      return data.users || [];
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'USERS_FETCH_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const suspendUser = useCallback(async (userId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/user/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw { code: 'SUSPEND_FAILED', message: 'Failed to suspend user' };
      }

      return await response.json();
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'SUSPEND_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      throw adminError;
    } finally {
      setLoading(false);
    }
  }, []);

  const reactivateUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/user/${userId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'REACTIVATE_FAILED', message: 'Failed to reactivate user' };
      }

      return await response.json();
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'REACTIVATE_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      throw adminError;
    } finally {
      setLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────
  // Audit API
  // ────────────────────────────────────────────

  const getAuditLogs = useCallback(async (filters?: {
    action?: string;
    result?: 'allowed' | 'denied';
    page?: number;
    limit?: number;
  }): Promise<{ entries: AuditEntry[]; total: number }> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.action) params.append('action', filters.action);
      if (filters?.result) params.append('result', filters.result);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/admin/audit/logs?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'AUDIT_FETCH_FAILED', message: 'Failed to load audit logs' };
      }

      const data = await response.json();
      return { entries: data.entries || [], total: data.count || 0 };
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'AUDIT_FETCH_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      return { entries: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const exportAuditLogs = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await fetch(`/api/admin/audit/logs/export?format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw { code: 'EXPORT_FAILED', message: 'Failed to export logs' };
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'EXPORT_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      throw adminError;
    }
  }, []);

  // ────────────────────────────────────────────
  // Session API
  // ────────────────────────────────────────────

  const getSessions = useCallback(async (): Promise<AdminSession[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'SESSIONS_FETCH_FAILED', message: 'Failed to load sessions' };
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'SESSIONS_FETCH_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'INVALIDATE_FAILED', message: 'Failed to invalidate session' };
      }

      return await response.json();
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'INVALIDATE_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      throw adminError;
    } finally {
      setLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────
  // Health API
  // ────────────────────────────────────────────

  const getSystemHealth = useCallback(async (): Promise<SystemHealth | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/system/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw { code: 'HEALTH_FETCH_FAILED', message: 'Failed to load health status' };
      }

      return await response.json();
    } catch (err) {
      const adminError: AdminError = err instanceof Error
        ? { code: 'HEALTH_FETCH_ERROR', message: err.message }
        : err as AdminError;
      setError(adminError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    updatePolicy,
    getUsers,
    suspendUser,
    reactivateUser,
    getAuditLogs,
    exportAuditLogs,
    getSessions,
    invalidateSession,
    getSystemHealth,
  };
}
