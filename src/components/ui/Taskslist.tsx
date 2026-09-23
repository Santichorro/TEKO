import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Badge } from './Badge'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { EmptyState } from './Emptystate'
import { fetchProjectTasks, groupTasksByStatus } from '../../lib/queries/tasks'
import type { TaskPriority, TaskStatus, TaskWithAssignee } from '../../types/task'

interface TaskslistProps {
  projectId: string
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  in_review: 'En revisión',
  completed: 'Completado',
}

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'completed']

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const PRIORITY_VARIANT: Record<TaskPriority, 'accent' | 'outline'> = {
  urgent: 'accent',
  high: 'accent',
  medium: 'outline',
  low: 'outline',
}

export function Taskslist({ projectId }: TaskslistProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchProjectTasks(projectId)
      .then(setTasks)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar las tareas.'))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <p className="label opacity-60">Cargando tareas...</p>
  if (error) return <p className="label text-red-500">{error}</p>

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Sin tareas todavía"
        description="Crea la primera tarea de este proyecto."
        action={
          <Link to={`/proyectos/${projectId}/tareas/nueva`}>
            <Button variant="accent">Crear tarea</Button>
          </Link>
        }
      />
    )
  }

  const grouped = groupTasksByStatus(tasks)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Link to={`/proyectos/${projectId}/tareas/nueva`}>
          <Button variant="accent">Crear tarea</Button>
        </Link>
      </div>

      {STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null

        return (
          <section key={status}>
            <h3 className="label opacity-60 mb-3">
              {STATUS_LABEL[status]} ({group.length})
            </h3>
            <div className="flex flex-col gap-3">
              {group.map((task) => (
                <TaskRow key={task.id} task={task} projectId={projectId} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TaskRow({ task, projectId }: { task: TaskWithAssignee; projectId: string }) {
  return (
    <Link to={`/proyectos/${projectId}/tareas/${task.id}`}>
      <Card padding="sm" className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          <span className="truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {task.due_date && (
            <span className="label opacity-60">{new Date(task.due_date).toLocaleDateString()}</span>
          )}
          {task.assignee ? (
            <Avatar name={task.assignee.name} />
          ) : (
            <span className="label opacity-40">Sin asignar</span>
          )}
        </div>
      </Card>
    </Link>
  )
}