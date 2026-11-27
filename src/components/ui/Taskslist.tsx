import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { Badge } from './Badge'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { EmptyState } from './Emptystate'
import { fetchProjectTasks, groupTasksByStatus } from '../../lib/queries/tasks'
import { formatDate, isOverdue } from '../../lib/dates'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, TASK_STATUS_ORDER } from '../../lib/labels'
import type { TaskPriority, TaskWithAssignee } from '../../types/task'

interface TaskslistProps {
  projectId: string
  /** Oculta "Crear tarea" a quien no tiene permiso (Observador) */
  canCreate?: boolean
}

const PRIORITY_VARIANT: Record<TaskPriority, 'accent' | 'outline'> = {
  urgent: 'accent',
  high: 'accent',
  medium: 'outline',
  low: 'outline',
}

export function Taskslist({ projectId, canCreate = true }: TaskslistProps) {
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
  })

  if (isLoading) return <p className="label opacity-60">Cargando tareas...</p>
  if (error) return <p className="label text-accent">{error.message}</p>

  const createButton = canCreate ? (
    <Link to={`/proyectos/${projectId}/tareas/nueva`}>
      <Button variant="accent">Crear tarea</Button>
    </Link>
  ) : undefined

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Sin tareas todavía"
        description={canCreate ? 'Crea la primera tarea de este proyecto.' : 'Este proyecto aún no tiene tareas.'}
        action={createButton}
      />
    )
  }

  const grouped = groupTasksByStatus(tasks)

  return (
    <div className="flex flex-col gap-8">
      {createButton && <div className="flex justify-end">{createButton}</div>}

      {TASK_STATUS_ORDER.map((status) => {
        const group = grouped[status]
        if (group.length === 0) return null

        return (
          <section key={status}>
            <h3 className="label opacity-60 mb-3">
              {TASK_STATUS_LABEL[status]} ({group.length})
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
  const overdue = task.status !== 'completed' && isOverdue(task.due_date)

  return (
    <Link to={`/proyectos/${projectId}/tareas/${task.id}`}>
      <Card padding="sm" className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={PRIORITY_VARIANT[task.priority]}>{TASK_PRIORITY_LABEL[task.priority]}</Badge>
          <span className={`truncate ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {task.due_date && (
            <span className={`label ${overdue ? 'text-accent' : 'opacity-60'}`}>
              {overdue ? 'Atrasada · ' : ''}
              {formatDate(task.due_date)}
            </span>
          )}
          {task.assignee ? (
            <Avatar name={task.assignee.name} size="sm" />
          ) : (
            <span className="label opacity-40">Sin asignar</span>
          )}
        </div>
      </Card>
    </Link>
  )
}
