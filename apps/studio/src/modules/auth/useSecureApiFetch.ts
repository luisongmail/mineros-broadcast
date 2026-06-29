import { useCallback } from 'react';
import { useAuth } from './SecurityContextProvider';

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean; // Skip auto-refresh for auth endpoints
}

/**
 * Hook para hacer requests autenticados con auto-refresh del token
 * 
 * Flujo:
 * 1. Intenta request con el JWT actual
 * 2. Si 401: llama a /api/auth/token/refresh (con refresh token en cookie)
 * 3. Si refresh ok: reintenta request con nuevo JWT
 * 4. Si refresh falla: cierra sesión
 */
export function useSecureApiFetch() {
  const { getAccessToken, setAccessToken, logout } = useAuth();

  const secureFetch = useCallback(
    async (
      input: RequestInfo | URL,
      init?: FetchOptions,
    ): Promise<Response> => {
      const { skipRefresh = false, ...fetchInit } = init ?? {};

      // Agregar token al header
      const token = getAccessToken();
      const headers = new Headers(fetchInit.headers ?? {});
      if (token && !skipRefresh) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      let res = await fetch(input, { ...fetchInit, headers });

      // Manejo de 401: intenta refresh y reintenta
      if (res.status === 401 && !skipRefresh && token) {
        console.log('[useSecureApiFetch] JWT expirado (401) — intentando refresh...');

        try {
          // Renovar JWT con refresh token en cookie
          const refreshRes = await fetch('/api/auth/token/refresh', {
            method: 'POST',
            credentials: 'include', // Envía refresh token en cookie
          });

          if (!refreshRes.ok) {
            console.warn('[useSecureApiFetch] Refresh falló:', refreshRes.status);
            // Refresh falló → cerrar sesión
            await logout();
            throw new Error('Session expired. Please login again.');
          }

          const refreshData = (await refreshRes.json()) as {
            accessToken?: string;
          };

          if (!refreshData.accessToken) {
            console.warn('[useSecureApiFetch] Refresh no retornó token');
            await logout();
            throw new Error('Failed to refresh token.');
          }

          // Guardar el nuevo token
          console.log('[useSecureApiFetch] Token renovado — reintentando request...');
          setAccessToken(refreshData.accessToken);

          // Reintenta la request original con el nuevo token
          const newHeaders = new Headers(fetchInit.headers ?? {});
          newHeaders.set('Authorization', `Bearer ${refreshData.accessToken}`);

          res = await fetch(input, { ...fetchInit, headers: newHeaders });
        } catch (err) {
          console.error('[useSecureApiFetch] Refresh error:', err);
          await logout();
          throw err;
        }
      }

      return res;
    },
    [getAccessToken, setAccessToken, logout],
  );

  return secureFetch;
}
