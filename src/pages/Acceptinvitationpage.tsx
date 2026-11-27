import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { useTeams } from '../context/Teamscontext';
import { getInvitationPreview, acceptInvitation } from '../services/Teamservice';
import type { InvitationPreview } from '../services/Teamservice';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TEAM_ROLE_LABEL } from '../lib/labels';

export function Acceptinvitationpage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user } = useAuth();
  const { refreshTeams, switchTeam } = useTeams();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Falta el token de invitación.');
      setLoading(false);
      return;
    }
    getInvitationPreview(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : 'Invitación inválida.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const teamId = await acceptInvitation(token);
      await refreshTeams();
      switchTeam(teamId);
      navigate('/equipo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación.');
    } finally {
      setAccepting(false);
    }
  }

  const wrap = (children: React.ReactNode) => (
    <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
      <Card className="w-full max-w-md flex flex-col gap-5">{children}</Card>
    </main>
  );

  if (loading) return wrap(<p className="label opacity-60">Verificando invitación…</p>);

  if (error) {
    return wrap(
      <>
        <h1 className="font-display text-2xl">Invitación no disponible</h1>
        <p className="text-sm opacity-70">{error}</p>
        <Link to="/dashboard" className="label underline">
          Ir a TEKO
        </Link>
      </>
    );
  }

  if (!preview) return null;

  const redirect = `/invitaciones/aceptar?token=${encodeURIComponent(token)}`;
  const roleLabel = TEAM_ROLE_LABEL[preview.role] ?? preview.role;

  return wrap(
    <>
      <div>
        <p className="label opacity-60 mb-2">Invitación</p>
        <h1 className="font-display text-3xl">{preview.team_name}</h1>
      </div>
      <p className="text-sm">
        Te invitaron como <strong>{roleLabel}</strong> ({preview.email}).
      </p>

      {!user ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm opacity-70">Inicia sesión o regístrate con {preview.email} para aceptar.</p>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}>
              Iniciar sesión
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirect)}`)}>
              Crear cuenta
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="accent" onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Uniéndote…' : `Unirme a ${preview.team_name}`}
        </Button>
      )}
    </>
  );
}
