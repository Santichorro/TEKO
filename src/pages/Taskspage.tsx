import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/Emptystate'
import { Taskfilterbar } from '../components/filters/Taskfilterbar'
import { Teamtaskrow } from '../components/filters/Teamtaskrow'
import { Taskcalendar } from '../components/calendar/Taskcalendar'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'
import { useTaskFilters } from '../hooks/useTaskFilters'
import { computeBlockedIds } from '../lib/blocked'
import { fetchTeamDependencies } from '../lib/queries/dashboard'
import { fetchTeamLabels } from '../lib/queries/labels'
import { fetchTeamTaskList } from '../lib/queries/tasks'
import { filterAndSort } from '../lib/taskFilters'
import { canEditTask } from '../lib/Teampermissions'
import { getTeamMembers } from '../services/Teamservice'

/** Día 12: todas las tareas del equipo, con filtros, orden y vista de calendario */
export function Taskspage() {
  const { user } = useAuth()
  const { currentTeam } = useTeams()
  const teamId = currentTeam?.id
  const { filters, setFilters, clearFilters } = useTaskFilters()
  const [params, setParams] = useSearchParams()
  const view = params.get('vista') === 'calendario' ? 'calendario' : 'lista'

  const tasksKey = ['team-tasks', teamId] as const
  const tasksQuery = useQuery({ queryKey: tasksKey, queryFn: () => fetchTeamTaskList(teamId!), enabled: !!teamId })
  const depsQuery = useQuery({
    queryKey: ['dashboard', 'dependencies', teamId],
    queryFn: () => fetchTeamDependencies(teamId!),
    enabled: !!teamId,
  })
  const membersQuery = useQuery({ queryKey: ['team-members', teamId], queryFn: () => getTeamMembers(teamId!), enabled: !!teamId })
  const labelsQuery = useQuery({ queryKey: ['labels', teamId], queryFn: () => fetchTeamLabels(teamId!), enabled: !!teamId })

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const blockedIds = useMemo(() => computeBlockedIds(tasks, depsQuery.data ?? []), [tasks, depsQuery.data])
  const visible = useMemo(
    () => filterAndSort(tasks, filters, { userId: user?.id, blockedIds }),
    [tasks, filters, user?.id, blockedIds]
  )
  const projects = useMemo(() => {
    const map = new Map(tasks.map((t) => [t.project.id, t.project.name]))
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  if (!currentTeam) return <p className="label opacity-60">Selecciona un equipo.</p>

  const setView = (v: 'lista' | 'calendario') =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v === 'lista') next.delete('vista')
        else next.set('vista', v)
        return next
      },
      { replace: true }
    )

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl mb-1">Tareas</h1>
          <p className="label opacity-60">Todas las tareas de {currentTeam.name}</p>
        </div>
        <div role="group" aria-label="Vista" className="flex border-2 border-ink">
          {(['lista', 'calendario'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`label px-4 py-2 border-r-2 border-ink last:border-r-0 ${view === v ? 'bg-ink text-surface' : 'bg-surface hover:bg-ink/5'}`}
            >
              {v === 'lista' ? 'Lista' : 'Calendario'}
            </button>
          ))}
        </div>
      </header>

      <Taskfilterbar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        members={(membersQuery.data ?? []).map((m) => ({ id: m.user_id, name: m.profile.name }))}
        labels={(labelsQuery.data ?? []).map((l) => ({ id: l.id, name: l.name }))}
        projects={projects}
        resultCount={tasksQuery.isLoading ? undefined : visible.length}
      />

      {tasksQuery.error && <p className="label text-accent">{tasksQuery.error.message}</p>}

      {tasksQuery.isLoading ? (
        <p className="label opacity-60">Cargando tareas…</p>
      ) : tasks.length === 0 ? (
        <EmptyState title="Sin tareas todavía" description="Cuando el equipo cree tareas en sus proyectos, aparecerán aquí." />
      ) : view === 'calendario' ? (
        <Taskcalendar
          tasks={visible}
          queryKey={[...tasksKey]}
          blockedIds={blockedIds}
          canEdit={(t) => canEditTask(currentTeam.role, user?.id, t)}
        />
      ) : visible.length === 0 ? (
        <EmptyState title="Nada coincide" description="Ninguna tarea cumple con los filtros. Prueba quitando alguno." />
      ) : (
        <ul className="border-2 border-ink bg-surface divide-y-2 divide-ink/10 shadow-hard-sm">
          {visible.map((t) => (
            <Teamtaskrow key={t.id} task={t} blocked={blockedIds.has(t.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}
