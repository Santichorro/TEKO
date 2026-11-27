import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Emptystate'
import { ProgressBar } from '../components/ui/Progressbar'
import { Activityfeed } from '../components/collab/Activityfeed'
import { Dashboardtaskrow } from '../components/dashboard/Dashboardtaskrow'
import { Statcard } from '../components/dashboard/Statcard'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'
import { buildDashboard } from '../lib/dashboard'
import { fetchTeamActivity, fetchTeamDependencies, fetchTeamTasks } from '../lib/queries/dashboard'
import { TEAM_ROLE_LABEL } from '../lib/labels'

const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: 'Planificación',
  active: 'Activo',
  paused: 'En pausa',
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="label opacity-60 mb-2">
        {title}
        {count !== undefined && ` (${count})`}
      </h2>
      {children}
    </section>
  )
}

/** Dashboard (Día 11): responde "¿qué requiere mi atención hoy?" */
export function Dashboardpage() {
  const { user } = useAuth()
  const { currentTeam, teams, loading } = useTeams()
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const teamId = currentTeam?.id

  // Se refresca al volver a la pestaña y cada minuto (los vencimientos cambian con el día)
  const tasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks', teamId],
    queryFn: () => fetchTeamTasks(teamId!),
    enabled: !!teamId,
    refetchInterval: 60_000,
  })
  const depsQuery = useQuery({
    queryKey: ['dashboard', 'dependencies', teamId],
    queryFn: () => fetchTeamDependencies(teamId!),
    enabled: !!teamId,
    refetchInterval: 60_000,
  })
  const activityQuery = useQuery({
    queryKey: ['dashboard', 'activity', teamId],
    queryFn: () => fetchTeamActivity(teamId!),
    enabled: !!teamId,
    refetchInterval: 60_000,
  })

  const data = useMemo(
    () => buildDashboard(tasksQuery.data ?? [], depsQuery.data ?? [], user?.id, scope),
    [tasksQuery.data, depsQuery.data, user?.id, scope]
  )

  const name = (user?.user_metadata?.name as string | undefined)?.split(' ')[0] ?? 'de nuevo'

  if (loading) return <p className="label opacity-60">Cargando…</p>

  if (teams.length === 0 || !currentTeam) {
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

  const loadingData = tasksQuery.isLoading || depsQuery.isLoading
  const error = tasksQuery.error ?? depsQuery.error
  const noTasksAtAll = !loadingData && (tasksQuery.data?.length ?? 0) === 0
  const allClear = data.overdue.length === 0 && data.blocked.length === 0 && data.dueSoon.length === 0
  const scopeWord = scope === 'mine' ? 'Mis' : 'Del equipo:'

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl mb-1">Hola, {name}</h1>
          <p className="label opacity-60">
            {currentTeam.name} /// {TEAM_ROLE_LABEL[currentTeam.role]} /// ¿Qué requiere tu atención hoy?
          </p>
        </div>
        <div role="group" aria-label="Qué tareas mostrar" className="flex border-2 border-ink">
          {(['mine', 'team'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
              className={`label px-4 py-2 border-r-2 border-ink last:border-r-0 focus-visible:outline-none focus-visible:shadow-hard-accent ${
                scope === value ? 'bg-ink text-surface' : 'bg-surface hover:bg-ink/5'
              }`}
            >
              {value === 'mine' ? 'Mis tareas' : 'Todo el equipo'}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="label text-accent">{error.message}</p>}

      {loadingData ? (
        <p className="label opacity-60">Cargando tu día…</p>
      ) : noTasksAtAll ? (
        <EmptyState
          title="Todavía no hay tareas"
          description="Crea un proyecto y agrega tareas: aquí verás lo que vence, lo atrasado y lo bloqueado."
          action={
            <Link to="/proyectos">
              <Button variant="accent">Ir a proyectos</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Statcard label={`${scopeWord} pendientes`} value={data.pending.length} />
            <Statcard label="Atrasadas" value={data.overdue.length} alert />
            <Statcard label="Bloqueadas" value={data.blocked.length} alert />
            <Statcard label="Vencen en 7 días" value={data.dueSoon.length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-2 flex flex-col gap-6">
              {allClear ? (
                <p className="text-sm">
                  <strong>Nada urgente.</strong> No hay tareas atrasadas, bloqueadas ni por vencer esta semana
                  {scope === 'mine' ? ' asignadas a ti' : ' en el equipo'}.
                </p>
              ) : (
                <>
                  {data.overdue.length > 0 && (
                    <Section title="Atrasadas" count={data.overdue.length}>
                      <ul className="divide-y-2 divide-ink/10">
                        {data.overdue.map((t) => (
                          <Dashboardtaskrow key={t.id} task={t} />
                        ))}
                      </ul>
                    </Section>
                  )}
                  {data.blocked.length > 0 && (
                    <Section title="Bloqueadas" count={data.blocked.length}>
                      <ul className="divide-y-2 divide-ink/10">
                        {data.blocked.map((t) => (
                          <Dashboardtaskrow key={t.id} task={t} blockers={t.blockers} />
                        ))}
                      </ul>
                    </Section>
                  )}
                  {data.dueSoon.length > 0 && (
                    <Section title="Próximos vencimientos (7 días)" count={data.dueSoon.length}>
                      <ul className="divide-y-2 divide-ink/10">
                        {data.dueSoon.map((t) => (
                          <Dashboardtaskrow key={t.id} task={t} />
                        ))}
                      </ul>
                    </Section>
                  )}
                </>
              )}

              <Section title={scope === 'mine' ? 'Mis tareas pendientes' : 'Pendientes del equipo'} count={data.pending.length}>
                {data.pending.length === 0 ? (
                  <p className="text-sm opacity-50">
                    {scope === 'mine' ? 'No tienes tareas asignadas pendientes.' : 'El equipo no tiene tareas pendientes.'}
                  </p>
                ) : (
                  <ul className="divide-y-2 divide-ink/10">
                    {data.pending.slice(0, 12).map((t) => (
                      <Dashboardtaskrow key={t.id} task={t} />
                    ))}
                  </ul>
                )}
                {data.pending.length > 12 && (
                  <p className="label opacity-50 mt-2">
                    Y {data.pending.length - 12} más: ordenadas por vencimiento y prioridad.
                  </p>
                )}
              </Section>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <h2 className="label opacity-60 mb-4">Proyectos y progreso</h2>
                {data.projects.length === 0 ? (
                  <p className="text-sm opacity-50">No hay proyectos activos con tareas.</p>
                ) : (
                  <ul className="flex flex-col gap-5">
                    {data.projects.map((p) => (
                      <li key={p.id}>
                        <Link to={`/proyectos/${p.id}`} className="block hover:opacity-80">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold truncate">{p.name}</span>
                            <span className="label opacity-50 shrink-0">{PROJECT_STATUS_LABEL[p.status] ?? p.status}</span>
                          </div>
                          <ProgressBar value={p.progress} label={`${p.completed} de ${p.total} tareas`} />
                          {(p.overdue > 0 || p.blocked > 0) && (
                            <p className="label text-accent mt-1">
                              {[p.overdue && `${p.overdue} atrasada${p.overdue > 1 ? 's' : ''}`, p.blocked && `${p.blocked} bloqueada${p.blocked > 1 ? 's' : ''}`]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <h2 className="label opacity-60 mb-2">Actividad reciente</h2>
                <Activityfeed entries={activityQuery.data ?? []} withTask emptyText="Aún no hay actividad en el equipo." />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
