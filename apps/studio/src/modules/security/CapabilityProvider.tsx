import React, { createContext, useContext, useCallback } from 'react';
import { useAuth } from '../auth/SecurityContextProvider';

interface CapabilityContextValue {
  can: (action: string, resourceType: string, resourceId: string) => Promise<boolean>;
}

const CapabilityContext = createContext<CapabilityContextValue>({
  can: async () => false,
});

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();

  const can = useCallback(
    async (action: string, resourceType: string, resourceId: string): Promise<boolean> => {
      if (!accessToken) return false;
      try {
        const res = await fetch('/api/security/authorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action, resourceType, resourceId }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { decision?: string };
        return data.decision === 'allow';
      } catch {
        return false;
      }
    },
    [accessToken],
  );

  return <CapabilityContext.Provider value={{ can }}>{children}</CapabilityContext.Provider>;
}

export function useCapability() {
  return useContext(CapabilityContext);
}

/** Hook que verifica un permiso de forma reactiva al montar */
export function usePermission(
  action: string,
  resourceType: string,
  resourceId: string,
): [boolean | null, boolean] {
  const { can } = useCapability();
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await can(action, resourceType, resourceId);
      if (!cancelled) {
        setAllowed(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [can, action, resourceType, resourceId]);

  return [allowed, loading];
}

/** HOC: renderiza children solo si el usuario tiene el permiso */
export function ProtectedAction({
  action,
  resourceType,
  resourceId,
  fallback = null,
  children,
}: {
  action: string;
  resourceType: string;
  resourceId: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [allowed, loading] = usePermission(action, resourceType, resourceId);
  if (loading) return null;
  return <>{allowed ? children : fallback}</>;
}
