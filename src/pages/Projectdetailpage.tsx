import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Emptystate'
import { useTeams } from '../context/Teamscontext'
import { fetchProjectDetail } from '../lib/queries/projects'
import { hasPermission } from '../lib/Teampermissions'
import type { ProjectStatus, ProjectWithLeader } from '../types/project'
import { Projectmemberslist } from '../components/ui/Projectmemberslist'
import { Taskslist } from '../components/ui/Taskslist'

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

export function Projectdetailpage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTeam } = useTeams()

  const [project, setProject] = useState<ProjectWithLeader | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTeam || !id) return
    setLoading(true)
    setError(null)
    fetchProjectDetail(currentTeam.id, id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el proyecto.'))
      .finally(() => setLoading(false))
  }, [currentTeam, id])

  if (!currentTeam) return null

  if (loading) {
    return (
      <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
        <p className="label opacity-60">Cargando proyecto...</p>
      </main>
    )
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
        <EmptyState
          title="Proyecto no encontrado"
          description={error ?? 'Este proyecto no existe o no pertenece a este equipo.'}
          action={
            <Link to="/proyectos">
              <Button variant="secondary">Volver a proyectos</Button>
            </Link>
          }
        />
      </main>
    )
  }

  const canManage = hasPermission(currentTeam.role, 'manage_projects')

  return (
    <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-3xl">{project.name}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[project.status]}>
              {STATUS_LABEL[project.status]}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm opacity-70 max-w-2xl">{project.description}</p>
          )}
        </div>

        {canManage && (
          <div className="flex gap-3 shrink-0">
            <Button variant="secondary" onClick={() => navigate(`/proyectos/${project.id}/editar`)}>
              Editar
            </Button>
            <Button variant="accent" onClick={() => navigate(`/proyectos/${project.id}/estado`)}>
              Cambiar estado
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="label opacity-60 mb-4">Información</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="label opacity-60">Líder</dt>
              <dd className="mt-1 flex items-center gap-2">
                {project.leader ? (
                  <>
                    <Avatar name={project.leader.name} />
                    <span>{project.leader.name}</span>
                  </>
                ) : (
                  <span className="opacity-50">Sin líder</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="label opacity-60">Progreso</dt>
              <dd className="mt-1">— (disponible en el Día 7)</dd>
            </div>
            <div>
              <dt className="label opacity-60">Fecha de inicio</dt>
              <dd className="mt-1">
                {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="label opacity-60">Fecha límite</dt>
              <dd className="mt-1">
                {project.due_date ? new Date(project.due_date).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
            <h2 className="label opacity-60 mb-4">Miembros ({project.member_count})</h2>
            <Projectmemberslist projectId={project.id} />
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="label opacity-60 mb-4">Tareas</h2>
        <Taskslist projectId={project.id} />
      </div>
      
    </main>
  )
}