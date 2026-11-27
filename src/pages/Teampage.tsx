import { useState } from 'react';
import { useTeams } from '../context/Teamscontext';
import { useAuth } from '../context/Authcontext';
import { createTeam } from '../services/Teamservice';
import { hasPermission } from '../lib/Teampermissions';
import { TEAM_ROLE_LABEL } from '../lib/labels';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Teammemberslist } from '../components/Teammemberslist';
import { Teaminvitemodal } from '../components/Teaminvitemodal';
import { Teampendinginvitations } from '../components/Teampendinginvitations';

function CreateTeamForm({ onCreated }: { onCreated: (teamId: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const team = await createTeam(name, user.id);
      setName('');
      onCreated(team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el equipo.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre del equipo"
        placeholder="Ej. Estudio Lozano"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error ?? undefined}
        required
      />
      <div>
        <Button type="submit" variant="accent" disabled={creating}>
          {creating ? 'Creando…' : 'Crear equipo'}
        </Button>
      </div>
    </form>
  );
}

export function Teampage() {
  const { teams, currentTeam, loading, error, refreshTeams, switchTeam } = useTeams();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [invitationsRefreshKey, setInvitationsRefreshKey] = useState(0);

  async function handleCreated(teamId: string) {
    await refreshTeams();
    switchTeam(teamId);
    setShowCreate(false);
  }

  if (loading) return <p className="label opacity-60">Cargando equipo…</p>;
  if (error) return <p className="label text-accent">{error}</p>;

  // Estado vacío: el usuario todavía no pertenece a ningún equipo.
  if (teams.length === 0) {
    return (
      <Card className="max-w-lg">
        <h1 className="font-display text-2xl mb-2">Todavía no tienes un equipo</h1>
        <p className="text-sm opacity-70 mb-6">
          Crea tu primer equipo para empezar a organizar proyectos y tareas.
        </p>
        <CreateTeamForm onCreated={handleCreated} />
      </Card>
    );
  }

  if (!currentTeam) return <p className="label opacity-60">Selecciona un equipo.</p>;

  const canInvite = hasPermission(currentTeam.role, 'invite_members');

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">{currentTeam.name}</h1>
          <Badge variant="accent">{TEAM_ROLE_LABEL[currentTeam.role]}</Badge>
        </div>
        <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancelar' : 'Crear otro equipo'}
        </Button>
      </header>

      {showCreate && (
        <Card className="max-w-lg">
          <CreateTeamForm onCreated={handleCreated} />
        </Card>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="label opacity-60">Miembros</h2>
          {canInvite && (
            <Button variant="accent" size="sm" onClick={() => setInviteOpen(true)}>
              Invitar miembro
            </Button>
          )}
        </div>
        <Teammemberslist />
      </section>

      {canInvite && (
        <Teampendinginvitations teamId={currentTeam.id} refreshKey={invitationsRefreshKey} />
      )}

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
