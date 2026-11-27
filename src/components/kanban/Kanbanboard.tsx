import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Kanbancolumn } from './Kanbancolumn'
import { Kanbancardbody } from './Kanbancard'
import { fetchProjectColumns, moveTask } from '../../lib/queries/columns'
import { fetchProjectTasks } from '../../lib/queries/tasks'
import { canEditTask } from '../../lib/Teampermissions'
import { useProjectTasksRealtime } from '../../hooks/useProjectTasksRealtime'
import type { TeamRole } from '../../services/Teamservice'
import type { TaskListItem } from '../../types/task'

type Items = Record<string, string[]> // columnId -> ids de tareas en orden

interface KanbanboardProps {
  projectId: string
  role: TeamRole
  userId: string | undefined
}

/** Posición nueva = punto medio entre vecinos (evita renumerar toda la columna) */
function positionBetween(prev: number | undefined, next: number | undefined): number {
  if (prev !== undefined && next !== undefined) return (prev + next) / 2
  if (prev !== undefined) return prev + 1
  if (next !== undefined) return next - 1
  return 1
}

export function Kanbanboard({ projectId, role, userId }: KanbanboardProps) {
  const queryClient = useQueryClient()
  useProjectTasksRealtime(projectId)

  const columnsQuery = useQuery({
    queryKey: ['columns', projectId],
    queryFn: () => fetchProjectColumns(projectId),
  })
  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
  })

  const columns = useMemo(() => columnsQuery.data ?? [], [columnsQuery.data])
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  // Orden que viene del servidor: por columna, por posición
  const serverItems = useMemo<Items>(() => {
    const byStatus = new Map(columns.map((c) => [c.status, c.id]))
    const result: Items = Object.fromEntries(columns.map((c) => [c.id, [] as string[]]))
    const sorted = [...tasks].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    for (const t of sorted) {
      const columnId = (t.column_id && result[t.column_id] ? t.column_id : byStatus.get(t.status)) ?? null
      if (columnId) result[columnId].push(t.id)
    }
    return result
  }, [columns, tasks])

  // Mientras se arrastra, el tablero usa una copia local
  const [localItems, setLocalItems] = useState<Items | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const items = localItems ?? serverItems
  const lastDropAt = useRef(0)

  // Las flechas ←/→ saltan a la columna vecina; ↑/↓ reordenan dentro de la columna.
  // (El comportamiento por defecto de dnd-kit no cambia bien de contenedor con teclado.)
  const itemsRef = useRef(items)
  const columnOrderRef = useRef<string[]>([])
  useLayoutEffect(() => {
    itemsRef.current = items
    columnOrderRef.current = columns.map((c) => c.id)
  }, [items, columns])

  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      event.preventDefault()
      const { active, droppableRects, collisionRect } = args.context
      if (!active || !collisionRect) return undefined
      const order = columnOrderRef.current
      const current = Object.keys(itemsRef.current).find((col) => itemsRef.current[col].includes(String(active.id)))
      const index = current ? order.indexOf(current) : -1
      const targetId = order[index + (event.code === 'ArrowRight' ? 1 : -1)]
      const rect = targetId ? droppableRects.get(targetId) : undefined
      if (!rect) return undefined
      // Al principio de la columna destino
      return { x: rect.left + 8, y: rect.top + 8 }
    }
    return sortableKeyboardCoordinates(event, args)
  }

  const canDragTask = (task: TaskListItem) => canEditTask(role, userId, task)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates })
  )

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) =>
      moveTask(taskId, columnId, position),
    onMutate: async ({ taskId, columnId, position }) => {
      // Actualización optimista: la tarjeta se queda donde la soltaste
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })
      const previous = queryClient.getQueryData<TaskListItem[]>(['tasks', projectId])
      const status = columns.find((c) => c.id === columnId)?.status
      queryClient.setQueryData<TaskListItem[]>(['tasks', projectId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, column_id: columnId, position, status: status ?? t.status } : t))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks', projectId], context.previous)
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })

  const findContainer = (id: string, source: Items): string | undefined =>
    id in source ? id : Object.keys(source).find((columnId) => source[columnId].includes(id))

  const columnName = (columnId: string | undefined) => columns.find((c) => c.id === columnId)?.name ?? ''

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setLocalItems(structuredClone(serverItems))
  }

  // Pasar de una columna a otra mientras se arrastra
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || !localItems) return
    const activeKey = String(active.id)
    const overKey = String(over.id)
    const from = findContainer(activeKey, localItems)
    const to = findContainer(overKey, localItems)
    if (!from || !to || from === to) return

    setLocalItems((prev) => {
      if (!prev) return prev
      const fromItems = prev[from].filter((id) => id !== activeKey)
      const toItems = [...prev[to]]
      const overIndex = toItems.indexOf(overKey)
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, activeKey)
      return { ...prev, [from]: fromItems, [to]: toItems }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    lastDropAt.current = Date.now()
    const activeKey = String(active.id)
    const working = localItems
    setActiveId(null)

    if (!over || !working) {
      setLocalItems(null)
      return
    }

    const to = findContainer(String(over.id), working)
    if (!to) {
      setLocalItems(null)
      return
    }

    // Reordenar dentro de la columna de destino
    let ordered = working[to]
    const oldIndex = ordered.indexOf(activeKey)
    const overIndex = ordered.indexOf(String(over.id))
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      ordered = arrayMove(ordered, oldIndex, overIndex)
    }

    const index = ordered.indexOf(activeKey)
    const original = taskById.get(activeKey)
    const originalColumn = findContainer(activeKey, serverItems)
    const originalIndex = originalColumn ? serverItems[originalColumn].indexOf(activeKey) : -1

    setLocalItems(null)
    if (!original || index < 0 || (originalColumn === to && originalIndex === index)) return

    const prevTask = taskById.get(ordered[index - 1])
    const nextTask = taskById.get(ordered[index + 1])
    const position = positionBetween(prevTask?.position, nextTask?.position)

    moveMutation.mutate({ taskId: activeKey, columnId: to, position })
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tarea "${taskById.get(String(active.id))?.title}" levantada.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Tarea "${taskById.get(String(active.id))?.title}" sobre ${columnName(findContainer(String(over.id), items))}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Tarea "${taskById.get(String(active.id))?.title}" soltada en ${columnName(findContainer(String(over.id), items))}.`
        : 'Movimiento cancelado.',
    onDragCancel: () => 'Movimiento cancelado.',
  }

  if (columnsQuery.isLoading || tasksQuery.isLoading) return <p className="label opacity-60">Cargando tablero…</p>
  if (columnsQuery.error || tasksQuery.error) {
    return <p className="label text-accent">{(columnsQuery.error ?? tasksQuery.error)?.message}</p>
  }
  if (columns.length === 0) return <p className="label opacity-60">Este proyecto no tiene columnas.</p>

  const activeTask = activeId ? taskById.get(activeId) : undefined

  return (
    <div className="flex flex-col gap-3">
      {moveMutation.error && (
        <p role="alert" className="label text-accent">
          {moveMutation.error.message}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setLocalItems(null)
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para mover una tarea, presiona Espacio. Usa las flechas para cambiarla de lugar o de columna. Espacio de nuevo para soltar, Escape para cancelar.',
          },
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <Kanbancolumn
              key={column.id}
              column={column}
              projectId={projectId}
              tasks={(items[column.id] ?? []).map((id) => taskById.get(id)).filter((t): t is TaskListItem => !!t)}
              canDragTask={canDragTask}
              shouldIgnoreClick={() => Date.now() - lastDropAt.current < 250}
            />
          ))}
        </div>

        <DragOverlay>{activeTask ? <Kanbancardbody task={activeTask} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
