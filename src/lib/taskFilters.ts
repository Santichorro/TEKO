/**
 * Filtros y orden de tareas (Día 12). Funciones puras: el estado vive en la URL
 * (?q=…&resp=me&…) para que el filtro sobreviva a recargas y se pueda compartir.
 */
import { parseDate } from './dates'
import type { TaskPriority, TaskStatus } from '../types/task'

export interface FilterableTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  due_date: string | null
  updated_at: string
  project_id: string
  task_labels: { label: { id: string } }[]
}

export type DueFilter = '' | 'overdue' | 'today' | 'week' | 'month' | 'nodate'
export type SortKey = 'due' | 'priority' | 'updated'

export interface TaskFilters {
  q: string
  /** '' = todos, 'me' = mis tareas, 'none' = sin asignar, o un user id */
  assignee: string
  status: TaskStatus | ''
  priority: TaskPriority | ''
  label: string
  project: string
  due: DueFilter
  blocked: boolean
  showCompleted: boolean
  sort: SortKey
}

export const DEFAULT_FILTERS: TaskFilters = {
  q: '',
  assignee: '',
  status: '',
  priority: '',
  label: '',
  project: '',
  due: '',
  blocked: false,
  showCompleted: true,
  sort: 'due',
}

// Nombres cortos en la URL
const KEYS: Record<keyof TaskFilters, string> = {
  q: 'q',
  assignee: 'resp',
  status: 'estado',
  priority: 'prioridad',
  label: 'etiqueta',
  project: 'proyecto',
  due: 'fecha',
  blocked: 'bloqueadas',
  showCompleted: 'completadas',
  sort: 'orden',
}

export function filtersFromParams(params: URLSearchParams): TaskFilters {
  const get = (k: keyof TaskFilters) => params.get(KEYS[k]) ?? ''
  return {
    q: get('q'),
    assignee: get('assignee'),
    status: get('status') as TaskFilters['status'],
    priority: get('priority') as TaskFilters['priority'],
    label: get('label'),
    project: get('project'),
    due: get('due') as DueFilter,
    blocked: get('blocked') === '1',
    showCompleted: get('showCompleted') !== '0',
    sort: (['due', 'priority', 'updated'].includes(get('sort')) ? get('sort') : 'due') as SortKey,
  }
}

/** Escribe solo lo que difiere del valor por defecto; conserva otros parámetros (p. ej. ?vista=) */
export function applyFiltersToParams(filters: TaskFilters, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base)
  for (const key of Object.keys(KEYS) as (keyof TaskFilters)[]) {
    const value = filters[key]
    const isDefault = value === DEFAULT_FILTERS[key]
    if (isDefault) params.delete(KEYS[key])
    else params.set(KEYS[key], typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  }
  return params
}

/** Cuántos filtros están activos (sin contar el orden) */
export function countActiveFilters(f: TaskFilters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof TaskFilters)[]).filter(
    (k) => k !== 'sort' && f[k] !== DEFAULT_FILTERS[k]
  ).length
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/** Quita tildes y pasa a minúsculas: "diseño" encuentra "Diseno" y viceversa */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export interface FilterContext {
  userId: string | undefined
  blockedIds: Set<string>
  today?: Date
}

export function matchesFilters(task: FilterableTask, f: TaskFilters, ctx: FilterContext): boolean {
  const today = startOfDay(ctx.today ?? new Date())

  if (!f.showCompleted && task.status === 'completed') return false
  if (f.q) {
    const needle = normalize(f.q.trim())
    if (needle && !normalize(`${task.title} ${task.description ?? ''}`).includes(needle)) return false
  }
  if (f.assignee === 'me' && task.assigned_to !== ctx.userId) return false
  if (f.assignee === 'none' && task.assigned_to !== null) return false
  if (f.assignee && f.assignee !== 'me' && f.assignee !== 'none' && task.assigned_to !== f.assignee) return false
  if (f.status && task.status !== f.status) return false
  if (f.priority && task.priority !== f.priority) return false
  if (f.label && !task.task_labels.some((tl) => tl.label.id === f.label)) return false
  if (f.project && task.project_id !== f.project) return false
  if (f.blocked && !ctx.blockedIds.has(task.id)) return false

  if (f.due) {
    if (f.due === 'nodate') return !task.due_date
    if (!task.due_date) return false
    const due = parseDate(task.due_date)
    switch (f.due) {
      case 'overdue':
        return task.status !== 'completed' && due < today
      case 'today':
        return due.getTime() === today.getTime()
      case 'week':
        return due >= today && due <= addDays(today, 7)
      case 'month':
        return due >= today && due <= addDays(today, 30)
    }
  }
  return true
}

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export function compareTasks(sort: SortKey) {
  const byDue = (a: FilterableTask, b: FilterableTask) =>
    (a.due_date ? parseDate(a.due_date).getTime() : Infinity) - (b.due_date ? parseDate(b.due_date).getTime() : Infinity)
  const byPriority = (a: FilterableTask, b: FilterableTask) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  const byUpdated = (a: FilterableTask, b: FilterableTask) => b.updated_at.localeCompare(a.updated_at)

  return (a: FilterableTask, b: FilterableTask) => {
    if (sort === 'priority') return byPriority(a, b) || byDue(a, b)
    if (sort === 'updated') return byUpdated(a, b)
    return byDue(a, b) || byPriority(a, b)
  }
}

export function filterAndSort<T extends FilterableTask>(tasks: T[], f: TaskFilters, ctx: FilterContext): T[] {
  return tasks.filter((t) => matchesFilters(t, f, ctx)).sort(compareTasks(f.sort))
}
