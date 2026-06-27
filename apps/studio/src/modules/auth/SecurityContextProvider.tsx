import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─────────────────────────────────────────────
// Tipos (alineados con security-contracts-v2.ts)
// ─────────────────────────────────────────────

export type AuthLevel = 'anonymous' | 'otp' | 'mfa' | 'step_up';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  authLevel: AuthLevel;
  sessionId: string;
  globalRoles: string[];
}

export interface ResourceScope {
  resourceType: string;
  resourceId: string;
  name: string;
  role: string;
  description?: string;
}

interface SecurityContextValue {
  user: UserProfile | null;
  currentScope: ResourceScope | null;
  availableScopes: ResourceScope[];
  securityFlags: {
    requiresStepUpForSensitiveActions: boolean;
    canViewAudit: boolean;
    isSysAdmin: boolean;
  } | null;
  loading: boolean;
  stepUpToken: string | null;
  setScope: (scope: ResourceScope) => void;
  clearScope: () => void;
  setStepUpToken: (token: string) => void;
  clearStepUpToken: () => void;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function SecurityContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [availableScopes, setAvailableScopes] = useState<ResourceScope[]>([]);
  const [currentScope, setCurrentScope] = useState<ResourceScope | null>(null);
  const [securityFlags, setSecurityFlags] = useState<SecurityContextValue['securityFlags']>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpToken, setStepUpTokenState] = useState<string | null>(null);

  // El access token (JWT) vive en memoria — nunca en localStorage
  const accessTokenRef = useRef<string | null>(null);

  const setAccessToken = useCallback((token: string) => {
    accessTokenRef.current = token;
  }, []);

  /** Carga el contexto de seguridad desde el servidor */
  const loadSecurityContext = useCallback(async (token: string): Promise<void> => {
    try {
      const res = await fetch('/api/security/context', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        user: UserProfile;
        availableScopes: ResourceScope[];
        securityFlags: SecurityContextValue['securityFlags'];
      };
      setUser(data.user);
      setAvailableScopes(data.availableScopes ?? []);
      setSecurityFlags(data.securityFlags ?? null);
    } catch {
      // Si falla el context, el usuario sigue autenticado con los datos del JWT
    }
  }, []);

  /** Al cargar la app: intenta refresh automático con la cookie httpOnly */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/token/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { accessToken?: string };
        if (data.accessToken) {
          accessTokenRef.current = data.accessToken;
          await loadSecurityContext(data.accessToken);
        }
      } catch {
        // Sin sesión activa — mostrar login
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadSecurityContext]);

  const setScope = useCallback((scope: ResourceScope) => {
    setCurrentScope(scope);
  }, []);

  const clearScope = useCallback(() => {
    setCurrentScope(null);
  }, []);

  const setStepUpToken = useCallback((token: string) => {
    setStepUpTokenState(token);
  }, []);

  const clearStepUpToken = useCallback(() => {
    setStepUpTokenState(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: accessTokenRef.current
          ? { Authorization: `Bearer ${accessTokenRef.current}` }
          : {},
      });
    } finally {
      accessTokenRef.current = null;
      setUser(null);
      setAvailableScopes([]);
      setCurrentScope(null);
      setSecurityFlags(null);
      setStepUpTokenState(null);
    }
  }, []);

  return (
    <SecurityContext.Provider
      value={{
        user,
        currentScope,
        availableScopes,
        securityFlags,
        loading,
        stepUpToken,
        setScope,
        clearScope,
        setStepUpToken,
        clearStepUpToken,
        setAccessToken,
        logout,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAuth(): SecurityContextValue {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de SecurityContextProvider');
  return ctx;
}
