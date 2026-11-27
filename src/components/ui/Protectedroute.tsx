import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/Authcontext.tsx';
import { getSafeRedirect } from '../../lib/redirect';

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
  const location = useLocation();

  if (loading) return null;
  if (session) {
    // Al iniciar sesión, vuelve a donde iba (invitación, ruta protegida) en vez de ir siempre al dashboard
    const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
    const target =
      getSafeRedirect(location.search) ?? (from ? `${from.pathname}${from.search ?? ''}` : '/dashboard');
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}