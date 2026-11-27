import { useEffect, useState, useCallback } from 'react';
import { useTeams } from '../context/Teamscontext';
import { useAuth } from '../context/Authcontext';
import { getTeamMembers } from '../services/Teamservice';
import type { TeamMemberWithProfile } from '../services/Teamservice';
import { canRemoveMember } from '../lib/Teampermissions';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Card } from './ui/Card';
import { TEAM_ROLE_LABEL } from '../lib/labels';

/**
 * El botón "Quitar" queda con un TODO: la función real de expulsar
 * (borrar de team_members) se conecta en el paso 6/7 junto con
 * invitaciones, para no mezclar la mutación con la sola lectura
 * de este paso. Por ahora está gateado por permisos pero deshabilitado.
 */
export function Teammemberslist() {
  const { user } = useAuth();
  const { currentTeam } = useTeams();
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!currentTeam) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTeamMembers(currentTeam.id);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los miembros.');
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  if (!currentTeam) return null;

  if (loading) {
    return <p className="label opacity-60">Cargando miembros…</p>;
  }

  if (error) {
    return <p className="label text-accent">{error}</p>;
  }

  return (
    <Card padding="sm">
    <ul className="flex flex-col divide-y-2 divide-ink/10">
      {members.map((member) => {
        const isSelf = member.user_id === user?.id;
        const canRemove = !isSelf && canRemoveMember(currentTeam.role, member.role);

        return (
          <li key={member.user_id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
            <Avatar name={member.profile.name} src={member.profile.avatar_url ?? undefined} />

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm truncate">
                {member.profile.name} {isSelf && <span className="label opacity-60">(tú)</span>}
              </span>
              <span className="label opacity-60 truncate normal-case">{member.profile.email}</span>
            </div>

            <Badge variant={member.role === 'owner' ? 'accent' : 'outline'}>
              {TEAM_ROLE_LABEL[member.role]}
            </Badge>

            {canRemove && (
              <Button variant="secondary" size="sm" disabled title="Pendiente: quitar miembros">
                Quitar
              </Button>
            )}
          </li>
        );
      })}
    </ul>
    </Card>
  );
}