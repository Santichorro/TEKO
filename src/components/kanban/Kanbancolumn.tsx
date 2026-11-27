import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Kanbancard } from './Kanbancard'
import type { Column } from '../../types/column'
import type { TaskListItem } from '../../types/task'

interface KanbancolumnProps {
  column: Column
  tasks: TaskListItem[]
  projectId: string
  canDragTask: (task: TaskListItem) => boolean
  shouldIgnoreClick: () => boolean
}

export function Kanbancolumn({ column, tasks, projectId, canDragTask, shouldIgnoreClick }: KanbancolumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <section
      aria-label={`Columna ${column.name}`}
      className={`flex flex-col min-w-64 w-64 shrink-0 border-2 border-ink ${isOver ? 'bg-accent/10' : 'bg-ink/5'}`}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b-2 border-ink bg-surface">
        <h3 className="font-display text-sm uppercase">{column.name}</h3>
        <span className="label opacity-60">{tasks.length}</span>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex flex-col gap-3 p-3 min-h-32 flex-1">
          {tasks.map((task) => (
            <Kanbancard
              key={task.id}
              task={task}
              projectId={projectId}
              canDrag={canDragTask(task)}
              shouldIgnoreClick={shouldIgnoreClick}
            />
          ))}
          {tasks.length === 0 && <li className="label opacity-40 text-center py-6 list-none">Suelta aquí</li>}
        </ul>
      </SortableContext>
    </section>
  )
}
