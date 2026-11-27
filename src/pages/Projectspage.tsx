import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/Emptystate'
import { useTeams } from '../context/Teamscontext'
import { fetchTeamProjects } from '../lib/queries/projects'
import { hasPermission } from '../lib/Teampermissions'
import type { ProjectStatus, ProjectWithLeader } from '../types/project'
import { formatDate } from '../lib/dates'

const MAIN_STATUSES: ProjectStatus[] = ['planning', 'active', 'paused', 'completed']
const ARCHIVE_STATUSES: ProjectStatus[] = ['archived', 'template']

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planificación',
  active: 'Activo',
  paused: 'En pausa',
  completed: 'Completado',
  archived: 'Archivado',
  template: 'Plantilla',
}

const STATUS_BADGE_VARIANT: Record<ProjectStatus, 'accent' | 'outline'> = {
  planning: 'outline',
  active: 'accent',
  paused: 'outline',
  completed: 'outline',
  archived: 'outline',
  template: 'outline',
}

export function Projectspage() {
  const { currentTeam, loading: teamLoading } = useTeams()

  if (teamLoading) {
    return (
      <div>
        <p className="label opacity-60">Cargando equipos...</p>
      </div>
    )
  }

  if (!currentTeam) {
    return (
      <div>
        <EmptyState
          title="Sin equipo seleccionado"
          description="Crea o selecciona un equipo para ver sus proyectos."
        />
      </div>
    )
  }

  const canCreate = hasPermission(currentTeam.role, 'manage_projects')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl mb-1">Proyectos</h1>
          <p className="label opacity-60">{currentTeam.name}</p>
        </div>
        {canCreate && (
          <Link to="/proyectos/nuevo">
            <Button variant="accent">Crear proyecto</Button>
          </Link>
        )}
      </div>

      <Tabs
        defaultValue="principal"
        tabs={[
          {
            value: 'principal',
            label: 'Proyectos',
            content: (
              <ProjectsSection
                teamId={currentTeam.id}
                sectionKey="principal"
                statuses={MAIN_STATUSES}
                emptyTitle="Sin proyectos todavía"
                emptyDescription="Crea el primer proyecto de este equipo."
                showCreateAction={canCreate}
              />
            ),
          },
          {
            value: 'archivo',
            label: 'Archivados y plantillas',
            content: (
              <ProjectsSection
                teamId={currentTeam.id}
                sectionKey="archivo"
                statuses={ARCHIVE_STATUSES}
                emptyTitle="Nada archivado o en plantillas"
                emptyDescription="Los proyectos archivados o guardados como plantilla aparecerán aquí."
              />
            ),
          },
        ]}
      />
    </div>
  )
}

interface ProjectsSectionProps {
  teamId: string
  sectionKey: string
  statuses: ProjectStatus[]
  emptyTitle: string
  emptyDescription: string
  showCreateAction?: boolean
}

function ProjectsSection({
  teamId,
  sectionKey,
  statuses,
  emptyTitle,
  emptyDescription,
  showCreateAction,
}: ProjectsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'todos'>('todos')

  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['projects', teamId, sectionKey],
    queryFn: () => fetchTeamProjects(teamId, statuses),
  })

  const filtered = useMemo(() => {
    if (!projects) return []
    if (statusFilter === 'todos') return projects
    return projects.filter((p) => p.status === statusFilter)
  }, [projects, statusFilter])

  return (
    <div>
      <div className="max-w-xs mb-8">
        <Select
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'todos')}
          options={[
            { value: 'todos', label: 'Todos' },
            ...statuses.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
        />
      </div>

      {isLoading && <p className="label opacity-60">Cargando proyectos...</p>}

      {isError && <p className="label text-red-500">No se pudieron cargar los proyectos.</p>}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            showCreateAction ? (
              <Link to="/proyectos/nuevo">
                <Button variant="accent">Crear proyecto</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: ProjectWithLeader }) {
  return (
    <Link to={`/proyectos/${project.id}`}>
      <Card className="flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight">{project.name}</h3>
          <Badge variant={STATUS_BADGE_VARIANT[project.status]}>
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>

        {project.description && (
          <p className="text-sm opacity-70 line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-2">
            {project.leader ? (
              <Avatar name={project.leader.name} />
            ) : (
              <span className="label opacity-50">Sin líder</span>
            )}
            <span className="label opacity-60">{project.member_count} miembros</span>
          </div>
          {project.due_date && (
            <span className="label opacity-60">
              {formatDate(project.due_date)}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}