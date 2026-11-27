import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { useProjectDependencies } from '../../hooks/useProjectDependencies'
import { addDependency, getBlockers, removeDependency } from '../../lib/queries/dependencies'
import { fetchProjectTasks } from '../../lib/queries/tasks'
import { TASK_STATUS_LABEL } from '../../lib/labels'
import type { TaskListItem } from '../../types/task'

interface TaskdependenciesProps {
  taskId: string
  projectId: string
  canManage: boolean
}

function TaskLine({
  task,
  projectId,
  onRemove,
  removing,
}: {
  task: TaskListItem
  projectId: string
  onRemove?: () => void
  removing?: boolean
}) {
  const done = task.status === 'completed'
  return (
    <li className="flex items-center gap-3 py-2">
      <Link
        to={`/proyectos/${projectId}/tareas/${task.id}`}
        className={`flex-1 min-w-0 text-sm truncate hover:underline ${done ? 'line-through opacity-50' : ''}`}
      >
        {task.title}
      </Link>
      <Badge variant={done ? 'outline' : 'solid'}>{TASK_STATUS_LABEL[task.status]}</Badge>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Quitar dependencia de "${task.title}"`}
          className="label px-1 opacity-40 hover:opacity-100 focus-visible:outline-none focus-visible:shadow-hard-accent"
        >
          ✕
        </button>
      )}
    </li>
  )
}

export function Taskdependencies({ taskId, projectId, canManage }: TaskdependenciesProps) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState('')

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
  })
  const { data: dependencies = [], isLoading } = useProjectDependencies(projectId)

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const dependsOn = dependencies
    .filter((d) => d.task_id === taskId)
    .map((d) => tasksById.get(d.depends_on_task_id))
    .filter((t): t is TaskListItem => !!t)
  const blocks = dependencies
    .filter((d) => d.depends_on_task_id === taskId)
    .map((d) => tasksById.get(d.task_id))
    .filter((t): t is TaskListItem => !!t)
  const blockers = getBlockers(taskId, dependencies, tasksById)

  // Candidatas: otras tareas principales que aún no son dependencia
  const candidates = tasks.filter((t) => t.id !== taskId && !dependsOn.some((d) => d.id === t.id))

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] })
  }

  const addMutation = useMutation({
    mutationFn: () => addDependency(taskId, selected),
    onSuccess: () => {
      setSelected('')
      refresh()
    },
  })

  const removeMutation = useMutation({
    mutationFn: (dependsOnId: string) => removeDependency(taskId, dependsOnId),
    onSuccess: refresh,
  })

  if (isLoading) return <p className="label opacity-60">Cargando dependencias…</p>

  return (
    <div className="flex flex-col gap-5">
      {blockers.length > 0 ? (
        <div role="status" className="border-2 border-ink bg-ink text-surface px-3 py-2">
          <p className="label mb-1">Bloqueada</p>
          <p className="text-sm">
            No puede avanzar hasta que se complete{blockers.length > 1 ? 'n' : ''}:{' '}
            {blockers.map((b) => `"${b.title}"`).join(', ')}.
          </p>
        </div>
      ) : (
        dependsOn.length > 0 && (
          <p role="status" className="label text-accent">
            Desbloqueada: todas sus dependencias están completas.
          </p>
        )
      )}

      <div>
        <h3 className="label opacity-60 mb-1">Depende de</h3>
        {dependsOn.length === 0 ? (
          <p className="text-sm opacity-50">No depende de ninguna tarea.</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-ink/10">
            {dependsOn.map((t) => (
              <TaskLine
                key={t.id}
                task={t}
                projectId={projectId}
                onRemove={canManage ? () => removeMutation.mutate(t.id) : undefined}
                removing={removeMutation.isPending}
              />
            ))}
          </ul>
        )}
      </div>

      {blocks.length > 0 && (
        <div>
          <h3 className="label opacity-60 mb-1">Bloquea a</h3>
          <ul className="flex flex-col divide-y-2 divide-ink/10">
            {blocks.map((t) => (
              <TaskLine key={t.id} task={t} projectId={projectId} />
            ))}
          </ul>
        </div>
      )}

      {removeMutation.error && <p className="label text-accent">{removeMutation.error.message}</p>}

      {canManage && candidates.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (selected) addMutation.mutate()
          }}
          className="flex gap-2 items-end border-t-2 border-ink/10 pt-4"
        >
          <div className="flex-1 min-w-0">
            <Select
              label="Agregar dependencia"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              error={addMutation.error?.message}
              options={[
                { value: '', label: 'Esta tarea depende de…' },
                ...candidates.map((t) => ({ value: t.id, label: t.title })),
              ]}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!selected || addMutation.isPending}>
            Agregar
          </Button>
        </form>
      )}
    </div>
  )
}
