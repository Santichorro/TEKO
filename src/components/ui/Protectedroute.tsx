import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/Authcontext.tsx';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Aquí puede ir el componente de loading del sistema visual (spinner / skeleton)
    return null;
  }

  if (!session) {
    // Guarda a dónde iba, para redirigirlo después del login si se quiere
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Inverso: para /login y /register — si ya hay sesión, no debe poder volver a entrar
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}