import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { useTeams } from '../context/Teamscontext';
import { getInvitationPreview, acceptInvitation } from '../services/Teamservice';
import type { InvitationPreview } from '../services/Teamservice';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

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

  if (loading) return <p>Verificando invitación…</p>;

  if (error) {
    return (
      <Card className="teko-accept-invitation">
        <p>{error}</p>
      </Card>
    );
  }

  if (!preview) return null;

  const redirect = `/invitaciones/aceptar?token=${token}`;

  return (
    <Card className="teko-accept-invitation">
      <h1>Invitación a {preview.team_name}</h1>
      <p>
        Te invitaron como <strong>{preview.role}</strong> ({preview.email}).
      </p>

      {!user ? (
        <div className="teko-accept-invitation__auth-actions">
          <p>Inicia sesión o regístrate con {preview.email} para aceptar.</p>
          <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirect)}`)}>
            Iniciar sesión
          </Button>
          <Link to={`/registro?redirect=${encodeURIComponent(redirect)}`}>Crear cuenta</Link>
        </div>
      ) : (
        <Button onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Uniéndote…' : `Unirme a ${preview.team_name}`}
        </Button>
      )}
    </Card>
  );
}