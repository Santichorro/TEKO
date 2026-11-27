import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Labelbadge } from '../labels/Labelbadge'
import { formatDate, isOverdue } from '../../lib/dates'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../../lib/labels'
import type { TeamTaskItem } from '../../lib/queries/tasks'

export function Teamtaskrow({ task, blocked }: { task: TeamTaskItem; blocked: boolean }) {
  const overdue = task.status !== 'completed' && isOverdue(task.due_date)
  const high = task.priority === 'urgent' || task.priority === 'high'

  return (
    <li>
      <Link
        to={`/proyectos/${task.project.id}/tareas/${task.id}`}
        className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_8rem_6rem_7rem_2rem] items-center gap-x-4 gap-y-1 py-2.5 px-2 hover:bg-ink/5 focus-visible:outline-none focus-visible:shadow-hard-accent"
      >
        <span className="min-w-0">
          <span className={`block text-sm truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
            {task.title}
          </span>
          <span className="flex flex-wrap items-center gap-1 mt-0.5">
            <span className="label opacity-50 mr-1">{task.project.name}</span>
            {blocked && <Badge variant="solid">Bloqueada</Badge>}
            {task.task_labels.slice(0, 3).map(({ label }) => (
              <Labelbadge key={label.id} name={label.name} color={label.color} />
            ))}
          </span>
        </span>
        <span className="label opacity-70 hidden md:block">{TASK_STATUS_LABEL[task.status]}</span>
        <span className="hidden md:block">
          {high ? <Badge variant="accent">{TASK_PRIORITY_LABEL[task.priority]}</Badge> : <span className="label opacity-50">{TASK_PRIORITY_LABEL[task.priority]}</span>}
        </span>
        <span className={`label text-right md:text-left ${overdue ? 'text-accent' : 'opacity-60'}`}>
          {task.due_date ? `${overdue ? 'Venció ' : ''}${formatDate(task.due_date)}` : 'Sin fecha'}
        </span>
        <span className="hidden md:flex justify-end">
          {task.assignee ? <Avatar name={task.assignee.name} size="sm" /> : <span className="label opacity-30">—</span>}
        </span>
      </Link>
    </li>
  )
}
