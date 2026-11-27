import { useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { rescheduleTask } from '../../lib/queries/tasks'
import { parseDate } from '../../lib/dates'
import type { TaskPriority, TaskStatus } from '../../types/task'

export interface CalendarTask {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  project_id: string
  project?: { name: string }
}

interface TaskcalendarProps<T extends CalendarTask> {
  tasks: T[]
  /** Caché que se actualiza de forma optimista al reprogramar */
  queryKey: QueryKey
  canEdit: (task: T) => boolean
  blockedIds: Set<string>
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const NO_DATE = 'sin-fecha'

/** 'YYYY-MM-DD' en hora local (no UTC) */
function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/** Lunes de la semana de `d` */
function startOfWeek(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (c.getDay() + 6) % 7 // lunes = 0
  return addDays(c, -offset)
}

interface ChipProps {
  task: CalendarTask
  draggable: boolean
  blocked: boolean
  overdue: boolean
  onOpen: () => void
}

function chipClass(task: CalendarTask, overdue: boolean, extra: string) {
  const done = task.status === 'completed'
  return `block w-full text-left text-xs leading-tight px-1.5 py-1 border-2 truncate select-none ${
    done ? 'line-through opacity-50 border-ink/30 bg-surface' : overdue ? 'border-accent bg-accent text-surface' : 'border-ink bg-surface'
  } ${extra}`
}

function ChipText({ task, blocked }: { task: CalendarTask; blocked: boolean }) {
  const high = task.priority === 'urgent' || task.priority === 'high'
  return (
    <>
      {blocked && <span aria-hidden="true">⛔ </span>}
      {high && task.status !== 'completed' && <span aria-hidden="true">! </span>}
      {task.title}
    </>
  )
}

/** Tarea en el calendario: clic/Enter la abre; arrastrar (o Espacio + flechas) la reprograma */
function Chip({ task, draggable, blocked, overdue, onOpen }: ChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !draggable })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
        else listeners?.onKeyDown?.(e)
      }}
      tabIndex={0}
      role="button"
      aria-label={`${task.title}${blocked ? ', bloqueada' : ''}${overdue ? ', atrasada' : ''}. Enter para abrir${draggable ? ', Espacio para mover' : ''}.`}
      title={task.project ? `${task.title} — ${task.project.name}` : task.title}
      className={chipClass(
        task,
        overdue,
        `${isDragging ? 'opacity-30' : ''} ${draggable ? 'cursor-grab' : 'cursor-pointer'} focus-visible:outline-none focus-visible:shadow-hard-accent`
      )}
    >
      <ChipText task={task} blocked={blocked} />
    </div>
  )
}

function DayCell({
  dateKey,
  label,
  muted,
  isToday,
  tall,
  children,
}: {
  dateKey: string
  label: string
  muted: boolean
  isToday: boolean
  tall: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia:${dateKey}` })
  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      className={`flex flex-col gap-1 p-1.5 border-r-2 border-b-2 border-ink min-w-0 ${tall ? 'min-h-64' : 'min-h-28'}
        ${isOver ? 'bg-accent/15' : muted ? 'bg-ink/5' : 'bg-surface'}`}
    >
      <span
        className={`label self-start px-1 ${isToday ? 'bg-ink text-surface' : muted ? 'opacity-40' : 'opacity-70'}`}
      >
        {Number(dateKey.slice(8))}
      </span>
      {children}
    </div>
  )
}

function NoDateTray({ children, count }: { children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: NO_DATE })
  return (
    <aside
      ref={setNodeRef}
      aria-label="Tareas sin fecha"
      className={`border-2 border-ink p-3 flex flex-col gap-2 ${isOver ? 'bg-accent/15' : 'bg-surface'}`}
    >
      <h3 className="label opacity-60">Sin fecha ({count})</h3>
      <p className="label opacity-40 normal-case tracking-normal">Arrastra una tarea a un día para programarla, o aquí para quitarle la fecha.</p>
      {children}
    </aside>
  )
}

export function Taskcalendar<T extends CalendarTask>({ tasks, queryKey, canEdit, blockedIds }: TaskcalendarProps<T>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeId, setActiveId] = useState<string | null>(null)
  const lastDropAt = useRef(0)

  const todayKey = toKey(new Date())
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const byDay = useMemo(() => {
    const map = new Map<string, T[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      const key = t.due_date.slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), t])
    }
    return map
  }, [tasks])
  const undated = tasks.filter((t) => !t.due_date)

  const days = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(anchor)
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const start = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [mode, anchor])

  const title =
    mode === 'month'
      ? anchor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      : `${days[0].toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`

  const move = (dir: 1 | -1) =>
    setAnchor((a) => (mode === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : addDays(a, 7 * dir)))

  const mutation = useMutation({
    mutationFn: ({ task, due }: { task: T; due: string | null }) => rescheduleTask(task.id, due, task.start_date),
    onMutate: async ({ task, due }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      queryClient.setQueryData<T[]>(queryKey, (old) => old?.map((t) => (t.id === task.id ? { ...t, due_date: due } : t)))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: (_d, _e, { task }) => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['task', task.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project_id] })
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  function handleDragEnd({ active, over }: DragEndEvent) {
    lastDropAt.current = Date.now()
    setActiveId(null)
    const task = byId.get(String(active.id))
    if (!task || !over) return
    const target = String(over.id)
    const due = target === NO_DATE ? null : target.replace('dia:', '')
    if ((task.due_date?.slice(0, 10) ?? null) === due) return
    mutation.mutate({ task, due })
  }

  // Ignora el "clic" que llega justo al soltar una tarea arrastrada
  const open = useCallback(
    (t: CalendarTask) => {
      if (Date.now() - lastDropAt.current > 250) navigate(`/proyectos/${t.project_id}/tareas/${t.id}`)
    },
    [navigate]
  )
  const isOverdueTask = (t: CalendarTask) => t.status !== 'completed' && !!t.due_date && parseDate(t.due_date) < parseDate(todayKey)
  const maxPerDay = mode === 'month' ? 3 : Infinity
  const activeTask = activeId ? byId.get(activeId) : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label={mode === 'month' ? 'Mes anterior' : 'Semana anterior'}>
            ‹
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            Hoy
          </Button>
          <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label={mode === 'month' ? 'Mes siguiente' : 'Semana siguiente'}>
            ›
          </Button>
          <h2 className="font-display text-xl capitalize ml-2" aria-live="polite">
            {title}
          </h2>
        </div>
        <div role="group" aria-label="Vista del calendario" className="flex border-2 border-ink">
          {(['week', 'month'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`label px-4 py-2 border-r-2 border-ink last:border-r-0 ${mode === m ? 'bg-ink text-surface' : 'hover:bg-ink/5'}`}
            >
              {m === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {mutation.error && (
        <p role="alert" className="label text-accent">
          {mutation.error.message}
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable: 'Espacio para levantar la tarea, flechas para moverla a otro día, Espacio para soltar, Escape para cancelar.',
          },
        }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_16rem] gap-4 items-start">
          <div className="overflow-x-auto">
            <div className="min-w-[42rem] border-l-2 border-t-2 border-ink">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="label text-center py-1.5 border-r-2 border-b-2 border-ink bg-ink text-surface">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = toKey(day)
                  const list = byDay.get(key) ?? []
                  const muted = mode === 'month' && day.getMonth() !== anchor.getMonth()
                  return (
                    <DayCell
                      key={key}
                      dateKey={key}
                      label={day.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                      muted={muted}
                      isToday={key === todayKey}
                      tall={mode === 'week'}
                    >
                      {list.slice(0, maxPerDay).map((t) => (
                        <Chip
                          key={t.id}
                          task={t}
                          draggable={canEdit(t)}
                          blocked={blockedIds.has(t.id)}
                          overdue={isOverdueTask(t)}
                          onOpen={() => open(t)}
                        />
                      ))}
                      {list.length > maxPerDay && (
                        <button
                          type="button"
                          className="label opacity-60 hover:opacity-100 text-left px-1"
                          onClick={() => {
                            setAnchor(day)
                            setMode('week')
                          }}
                        >
                          +{list.length - maxPerDay} más
                        </button>
                      )}
                    </DayCell>
                  )
                })}
              </div>
            </div>
          </div>

          <NoDateTray count={undated.length}>
            {undated.map((t) => (
              <Chip key={t.id} task={t} draggable={canEdit(t)} blocked={blockedIds.has(t.id)} overdue={false} onOpen={() => open(t)} />
            ))}
          </NoDateTray>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className={chipClass(activeTask, false, 'shadow-hard-accent w-40')}>
              <ChipText task={activeTask} blocked={blockedIds.has(activeTask.id)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
