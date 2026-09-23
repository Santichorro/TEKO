import { useEffect, useState, useCallback } from 'react';
import { useTeams } from '../context/Teamscontext';
import { useAuth } from '../context/Authcontext';
import { getTeamMembers } from '../services/Teamservice';
import type { TeamMemberWithProfile } from '../services/Teamservice';
import { canRemoveMember } from '../lib/Teampermissions';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

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
    return <p className="teko-members-list__loading">Cargando miembros…</p>;
  }

  if (error) {
    return <p className="teko-members-list__error">{error}</p>;
  }

  return (
    <ul className="teko-members-list">
      {members.map((member) => {
        const isSelf = member.user_id === user?.id;
        const canRemove = !isSelf && canRemoveMember(currentTeam.role, member.role);

        return (
          <li key={member.user_id} className="teko-members-list__item">
            {member.profile.avatar_url ? (
              <img
                src={member.profile.avatar_url}
                alt=""
                className="teko-members-list__avatar"
              />
            ) : (
              <div className="teko-members-list__avatar teko-members-list__avatar--placeholder">
                {member.profile.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="teko-members-list__info">
              <span className="teko-members-list__name">
                {member.profile.name} {isSelf && '(tú)'}
              </span>
              <span className="teko-members-list__email">{member.profile.email}</span>
            </div>

            <Badge>{member.role}</Badge>

            {canRemove && (
              <Button variant="secondary" disabled title="Se conecta en el paso 6">
                Quitar
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}