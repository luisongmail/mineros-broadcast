import type { ReactNode } from 'react';
import { useAuth } from './SecurityContextProvider';
import { Navigate } from 'react-router-dom';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles requeridos (OR logic) */
  allowedRoles?: string[];
  /** Acción requerida para autorizar */
  action?: string;
  /** Tipo de recurso */
  resourceType?: string;
  /** Fallback si no está autorizado */
  fallback?: ReactNode;
  /** Mostrar loader mientras valida */
  loadingComponent?: ReactNode;
}

/**
 * ProtectedRoute — Valida que el usuario tenga los roles requeridos.
 * Si no está autorizado, redirige a login o muestra fallback.
 *
 * Uso:
 *   <ProtectedRoute allowedRoles={['Admin', 'SysAdmin']}>
 *     <AdminPanel />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
  loadingComponent,
}: ProtectedRouteProps) {
  const auth = useAuth();

  // Todavía cargando contexto
  if (auth.loading) {
    return <>{loadingComponent ?? <div className="p-4 text-gray-400">Cargando...</div>}</>;
  }

  // No autenticado
  if (!auth.user) {
    return fallback ? <>{fallback}</> : <Navigate to="/auth/login" replace />;
  }

  // Sin roles requeridos → permitir
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Validar que tenga uno de los roles requeridos (OR logic)
  const hasRole = auth.user.globalRoles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-gray-400 mb-4">No tienes permiso para acceder a esta página.</p>
          <p className="text-gray-500 text-sm">Roles requeridos: {allowedRoles.join(', ')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
