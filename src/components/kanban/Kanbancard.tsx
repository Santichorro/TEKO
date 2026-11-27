import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Labelbadge } from '../labels/Labelbadge'
import { formatDate, isOverdue } from '../../lib/dates'
import { TASK_PRIORITY_LABEL } from '../../lib/labels'
import type { TaskListItem } from '../../types/task'

interface KanbancardProps {
  task: TaskListItem
  projectId: string
  canDrag: boolean
  /** true justo después de soltar: evita que el "click" final abra la tarea */
  shouldIgnoreClick: () => boolean
  /** Títulos de las tareas pendientes que bloquean a esta */
  blockers: string[]
}

/** Contenido visual de la tarjeta (se reutiliza en el DragOverlay) */
export function Kanbancardbody({
  task,
  blockers = [],
  dragging = false,
}: {
  task: TaskListItem
  blockers?: string[]
  dragging?: boolean
}) {
  const overdue = task.status !== 'completed' && isOverdue(task.due_date)
  const subDone = task.subtasks.filter((s) => s.status === 'completed').length
  const highPriority = task.priority === 'urgent' || task.priority === 'high'

  return (
    <div
      className={`bg-surface border-2 border-ink p-3 flex flex-col gap-2 text-left ${
        dragging ? 'shadow-hard-accent rotate-1' : 'shadow-hard-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm leading-snug ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
          {task.title}
        </span>
        {highPriority && <Badge variant="accent">{TASK_PRIORITY_LABEL[task.priority]}</Badge>}
      </div>

      {blockers.length > 0 && (
        <p className="label bg-ink text-surface px-2 py-1" title={`Depende de: ${blockers.join(', ')}`}>
          Bloqueada · {blockers.length === 1 ? blockers[0] : `${blockers.length} tareas`}
        </p>
      )}

      {task.task_labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.task_labels.map(({ label }) => (
            <Labelbadge key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`label ${overdue ? 'text-accent' : 'opacity-60'}`}>
              {overdue ? 'Atrasada · ' : ''}
              {formatDate(task.due_date)}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="label opacity-60">
              ☐ {subDone}/{task.subtasks.length}
            </span>
          )}
        </div>
        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
      </div>
    </div>
  )
}

export function Kanbancard({ task, projectId, canDrag, shouldIgnoreClick, blockers }: KanbancardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`list-none ${isDragging ? 'opacity-30' : ''} ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...attributes}
      {...listeners}
      // Enter abre la tarea; Espacio la levanta para moverla con flechas (KeyboardSensor)
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/proyectos/${projectId}/tareas/${task.id}`)
        else listeners?.onKeyDown?.(e)
      }}
      onClick={() => {
        if (!shouldIgnoreClick()) navigate(`/proyectos/${projectId}/tareas/${task.id}`)
      }}
      aria-label={`${task.title}.${blockers.length ? ` Bloqueada por ${blockers.join(', ')}.` : ''} ${canDrag ? 'Espacio para mover, Enter para abrir.' : 'Enter para abrir.'}`}
      tabIndex={0}
    >
      <Kanbancardbody task={task} blockers={blockers} />
    </li>
  )
}
