import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './SecurityContextProvider';

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * Protege una ruta: redirige a /login si no hay sesión activa.
 * Muestra un spinner mientras se valida el token al cargar la página.
 */
export function PrivateRoute({ children }: PrivateRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-500 text-sm">Cargando…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
