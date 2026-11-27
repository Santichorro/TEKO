import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { formatDate, isOverdue } from '../../lib/dates'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../../lib/labels'
import type { DashboardTask } from '../../lib/queries/dashboard'

interface DashboardtaskrowProps {
  task: DashboardTask
  /** Motivo de bloqueo (títulos de las tareas pendientes de las que depende) */
  blockers?: string[]
}

export function Dashboardtaskrow({ task, blockers }: DashboardtaskrowProps) {
  const overdue = task.status !== 'completed' && isOverdue(task.due_date)
  const high = task.priority === 'urgent' || task.priority === 'high'

  return (
    <li>
      <Link
        to={`/proyectos/${task.project.id}/tareas/${task.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 px-1 hover:bg-ink/5 focus-visible:outline-none focus-visible:shadow-hard-accent"
      >
        <span className="flex-1 min-w-48">
          <span className="block text-sm truncate">{task.title}</span>
          <span className="label opacity-50">
            {task.project.name} · {TASK_STATUS_LABEL[task.status]}
          </span>
          {blockers && blockers.length > 0 && (
            <span className="block label text-accent normal-case tracking-normal mt-0.5">
              Espera a: {blockers.join(', ')}
            </span>
          )}
        </span>
        {high && <Badge variant="accent">{TASK_PRIORITY_LABEL[task.priority]}</Badge>}
        {task.due_date && (
          <span className={`label shrink-0 ${overdue ? 'text-accent' : 'opacity-60'}`}>
            {overdue ? 'Venció ' : ''}
            {formatDate(task.due_date)}
          </span>
        )}
      </Link>
    </li>
  )
}
