import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Labelbadge } from '../labels/Labelbadge'
import { addTaskLabel, fetchTeamLabels, removeTaskLabel } from '../../lib/queries/labels'
import type { Label } from '../../types/label'

interface TasklabelsProps {
  taskId: string
  projectId: string
  teamId: string
  assigned: Pick<Label, 'id' | 'name' | 'color'>[]
  canEdit: boolean
}

/**
 * Etiquetas de una tarea. Con permiso de edición se muestran todas las del
 * equipo como interruptores (activas = asignadas); sin permiso, solo las asignadas.
 */
export function Tasklabels({ taskId, projectId, teamId, assigned, canEdit }: TasklabelsProps) {
  const queryClient = useQueryClient()
  const assignedIds = new Set(assigned.map((l) => l.id))

  const { data: teamLabels = [] } = useQuery({
    queryKey: ['labels', teamId],
    queryFn: () => fetchTeamLabels(teamId),
    enabled: canEdit,
  })

  const toggle = useMutation({
    mutationFn: ({ labelId, on }: { labelId: string; on: boolean }) =>
      on ? addTaskLabel(taskId, labelId) : removeTaskLabel(taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  if (!canEdit) {
    if (assigned.length === 0) return <p className="text-sm opacity-50">Sin etiquetas.</p>
    return (
      <ul className="flex flex-wrap gap-2">
        {assigned.map((l) => (
          <li key={l.id}>
            <Labelbadge name={l.name} color={l.color} />
          </li>
        ))}
      </ul>
    )
  }

  if (teamLabels.length === 0) {
    return (
      <p className="text-sm opacity-60">
        El equipo no tiene etiquetas.{' '}
        <Link to="/equipo" className="underline">
          Crear en Equipo
        </Link>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        {teamLabels.map((label) => {
          const on = assignedIds.has(label.id)
          return (
            <li key={label.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ labelId: label.id, on: !on })}
                className={`transition-opacity focus-visible:outline-none focus-visible:shadow-hard-accent ${
                  on ? '' : 'opacity-35 hover:opacity-70'
                }`}
                title={on ? 'Quitar etiqueta' : 'Agregar etiqueta'}
              >
                <Labelbadge name={label.name} color={label.color} />
              </button>
            </li>
          )
        })}
      </ul>
      {toggle.error && <p className="label text-accent">{toggle.error.message}</p>}
    </div>
  )
}
