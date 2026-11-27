import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/Confirmdialog'
import { useTeams } from '../context/Teamscontext'
import { fetchProjectDetail, updateProjectStatus } from '../lib/queries/projects'
import { getAvailableTransitions } from '../lib/projectTransitions'
import { hasPermission } from '../lib/Teampermissions'
import type { ProjectStatus, ProjectWithLeader } from '../types/project'

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

const ACTION_LABEL: Record<ProjectStatus, string> = {
  planning: 'Volver a planificación',
  active: 'Activar',
  paused: 'Pausar',
  completed: 'Completar',
  archived: 'Archivar',
  template: 'Convertir en plantilla',
}

const ACTION_DESCRIPTION: Record<ProjectStatus, string> = {
  planning: 'El proyecto vuelve a planificación y sigue editable.',
  active: 'El proyecto queda activo y todas las funciones normales se habilitan.',
  paused: 'El proyecto se conserva pero queda temporalmente detenido.',
  completed: 'El proyecto queda marcado como objetivo alcanzado.',
  archived: 'El proyecto queda fuera de la operación activa, en modo solo lectura. Puede restaurarse después.',
  template: 'El proyecto deja de representar trabajo operativo.',
}

export function Projectstatuspage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTeam } = useTeams()

  const [project, setProject] = useState<ProjectWithLeader | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<ProjectStatus | null>(null)

  useEffect(() => {
    if (!currentTeam || !id) return
    setLoading(true)
    fetchProjectDetail(currentTeam.id, id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el proyecto.'))
      .finally(() => setLoading(false))
  }, [currentTeam, id])

  if (!currentTeam || !id) return null

  if (loading) {
    return (
      <div>
        <p className="label opacity-60">Cargando proyecto...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <p className="label opacity-60">Proyecto no encontrado.</p>
      </div>
    )
  }

  if (!hasPermission(currentTeam.role, 'manage_projects')) {
    return (
      <div>
        <p className="label opacity-60">No tienes permiso para cambiar el estado de este proyecto.</p>
      </div>
    )
  }

  const availableTransitions = getAvailableTransitions(project.status)

  async function handleConfirm() {
    if (!pendingTarget || !project) return
    setSubmitting(true)
    setError(null)
    try {
      await updateProjectStatus(project.id, project.status, pendingTarget)
      navigate(`/proyectos/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setSubmitting(false)
      setPendingTarget(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Cambiar estado</h1>
      <p className="label opacity-60 mb-10">{project.name}</p>

      <Card className="max-w-lg flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="label opacity-60">Estado actual</span>
          <Badge variant={STATUS_BADGE_VARIANT[project.status]}>
            {STATUS_LABEL[project.status]}
          </Badge>
        </div>

        {availableTransitions.length === 0 ? (
          <p className="text-sm opacity-60">Este proyecto no tiene transiciones disponibles.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {availableTransitions.map((status) => (
              <Button
                key={status}
                variant={status === 'archived' ? 'primary' : 'accent'}
                onClick={() => setPendingTarget(status)}
                disabled={submitting}
              >
                {ACTION_LABEL[status]}
              </Button>
            ))}
          </div>
        )}

        {error && <p className="label text-red-500">{error}</p>}

        <Button variant="secondary" onClick={() => navigate(`/proyectos/${project.id}`)}>
          Volver al proyecto
        </Button>
      </Card>

      <ConfirmDialog
        open={pendingTarget !== null}
        onClose={() => setPendingTarget(null)}
        onConfirm={handleConfirm}
        title={pendingTarget ? ACTION_LABEL[pendingTarget] : ''}
        description={pendingTarget ? ACTION_DESCRIPTION[pendingTarget] : undefined}
        confirmLabel={pendingTarget ? ACTION_LABEL[pendingTarget] : 'Confirmar'}
        destructive={pendingTarget === 'archived'}
      />
    </div>
  )
}