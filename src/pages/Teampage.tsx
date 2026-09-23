import { useState } from 'react';
import { useTeams } from '../context/Teamscontext';
import { useAuth } from '../context/Authcontext';
import { createTeam } from '../services/Teamservice';
import { hasPermission } from '../lib/Teampermissions';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Teammemberslist } from '../components/Teammemberslist';
import { Teaminvitemodal } from '../components/Teaminvitemodal';
import { Teampendinginvitations } from '../components/Teampendinginvitations';

/**
 * Asumo que Button, Badge y Card viven en src/components/ui/ (siguiendo
 * el patrón de Protectedroute.tsx del Día 4). Ajusta las rutas si tu
 * estructura es distinta.
 */
export function Teampage() {
  const { user } = useAuth();
  const { teams, currentTeam, loading, error, refreshTeams } = useTeams();
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitationsRefreshKey, setInvitationsRefreshKey] = useState(0);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createTeam(newTeamName, user.id);
      setNewTeamName('');
      await refreshTeams();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el equipo.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="teko-team-page__loading">Cargando equipo…</div>;
  }

  if (error) {
    return <div className="teko-team-page__error">{error}</div>;
  }

  // Estado vacío: el usuario todavía no pertenece a ningún equipo.
  if (teams.length === 0) {
    return (
      <Card className="teko-team-page__empty">
        <h2>Todavía no tienes un equipo</h2>
        <p>Crea tu primer equipo para empezar a organizar proyectos y tareas.</p>
        <form onSubmit={handleCreateTeam} className="teko-team-page__create-form">
          <input
            type="text"
            placeholder="Nombre del equipo"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
          />
          <Button type="submit" disabled={creating}>
            {creating ? 'Creando…' : 'Crear equipo'}
          </Button>
        </form>
        {createError && <p className="teko-team-page__create-error">{createError}</p>}
      </Card>
    );
  }

  if (!currentTeam) {
    // No debería pasar (hay teams pero ninguno seleccionado), pero cubrimos el caso.
    return <div>Selecciona un equipo.</div>;
  }

  const canInvite = hasPermission(currentTeam.role, 'invite_members');
  const canManageSettings = hasPermission(currentTeam.role, 'manage_team_settings');

  return (
    <div className="teko-team-page">
      <header className="teko-team-page__header">
        <div>
          <h1>{currentTeam.name}</h1>
          <Badge>{currentTeam.role}</Badge>
        </div>
        {canManageSettings && (
          <Button variant="secondary">Configuración del equipo</Button>
        )}
      </header>

      <section className="teko-team-page__members">
        <div className="teko-team-page__members-header">
          <h2>Miembros</h2>
          {canInvite && <Button onClick={() => setInviteOpen(true)}>Invitar miembro</Button>}
        </div>
        <Teammemberslist />

        {canInvite && (
          <Teampendinginvitations teamId={currentTeam.id} refreshKey={invitationsRefreshKey} />
        )}
      </section>

      {canInvite && (
        <Teaminvitemodal
          teamId={currentTeam.id}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvited={() => setInvitationsRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}