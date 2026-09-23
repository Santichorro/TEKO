import { useEffect, useState, useCallback } from 'react';
import type { Invitation } from '../services/Teamservice';
import { getPendingInvitations, revokeInvitation } from '../services/Teamservice';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface TeampendinginvitationsProps {
  teamId: string;
  /** Se incrementa desde afuera (Teampage) cada vez que se crea una invitación, para forzar el refresh. */
  refreshKey?: number;
}

export function Teampendinginvitations({ teamId, refreshKey }: TeampendinginvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInvitations(await getPendingInvitations(teamId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las invitaciones.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleRevoke(id: string) {
    try {
      await revokeInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la invitación.');
    }
  }

  if (loading) return <p>Cargando invitaciones…</p>;
  if (error) return <p className="teko-pending-invitations__error">{error}</p>;
  if (invitations.length === 0) return null;

  return (
    <div className="teko-pending-invitations">
      <h3>Invitaciones pendientes</h3>
      <ul>
        {invitations.map((inv) => {
          const expired = new Date(inv.expires_at) < new Date();
          return (
            <li key={inv.id} className="teko-pending-invitations__item">
              <span>{inv.email}</span>
              <Badge>{inv.role}</Badge>
              {expired && <Badge>expirada</Badge>}
              <Button variant="secondary" onClick={() => handleRevoke(inv.id)}>
                Cancelar
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}