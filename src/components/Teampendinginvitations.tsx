import { useEffect, useState, useCallback } from 'react';
import type { Invitation } from '../services/Teamservice';
import { getPendingInvitations, revokeInvitation } from '../services/Teamservice';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TEAM_ROLE_LABEL } from '../lib/labels';
import { formatDate } from '../lib/dates';

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

  if (loading) return <p className="label opacity-60">Cargando invitaciones…</p>;
  if (error) return <p className="label text-accent">{error}</p>;
  if (invitations.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label opacity-60">Invitaciones pendientes</h2>
      <Card padding="sm">
      <ul className="flex flex-col divide-y-2 divide-ink/10">
        {invitations.map((inv) => {
          const expired = new Date(inv.expires_at) < new Date();
          return (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-1">
              <span className="text-sm flex-1 min-w-0 truncate">{inv.email}</span>
              <Badge>{TEAM_ROLE_LABEL[inv.role]}</Badge>
              {expired ? (
                <Badge variant="solid">Expirada</Badge>
              ) : (
                <span className="label opacity-60">Vence {formatDate(inv.expires_at)}</span>
              )}
              <Button variant="secondary" size="sm" onClick={() => handleRevoke(inv.id)}>
                Cancelar
              </Button>
            </li>
          );
        })}
      </ul>
      </Card>
    </section>
  );
}