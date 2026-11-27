import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Emptystate'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'
import { TEAM_ROLE_LABEL } from '../lib/labels'

/** Inicio provisional. El Dashboard real ("¿qué requiere mi atención hoy?") es el Día 11. */
export function Dashboardpage() {
  const { user } = useAuth()
  const { currentTeam, teams, loading } = useTeams()
  const name = (user?.user_metadata?.name as string | undefined) ?? 'de nuevo'

  if (loading) return <p className="label opacity-60">Cargando…</p>

  if (teams.length === 0) {
    return (
      <EmptyState
        title="Crea tu primer equipo"
        description="En TEKO todo vive dentro de un equipo: proyectos, tareas y miembros."
        action={
          <Link to="/equipo">
            <Button variant="accent">Crear equipo</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl mb-1">Hola, {name}</h1>
        {currentTeam && (
          <p className="label opacity-60">
            {currentTeam.name} /// {TEAM_ROLE_LABEL[currentTeam.role]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Link to="/proyectos">
          <Card className="h-full">
            <h2 className="font-display text-xl mb-2">Proyectos</h2>
            <p className="text-sm opacity-70">Revisa el estado de los proyectos del equipo y sus tareas.</p>
          </Card>
        </Link>
        <Link to="/equipo">
          <Card className="h-full">
            <h2 className="font-display text-xl mb-2">Equipo</h2>
            <p className="text-sm opacity-70">Miembros, roles e invitaciones.</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
