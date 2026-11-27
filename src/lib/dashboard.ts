/**
 * Cálculos del Dashboard ("¿qué requiere mi atención hoy?").
 * Funciones puras: reciben datos y una fecha de hoy, sin tocar la red,
 * para poder probarlas con tests unitarios (Día 14).
 */
import { parseDate } from './dates'
import type { Dependency } from './queries/dependencies'
import type { DashboardTask } from './queries/dashboard'
import type { TaskPriority } from '../types/task'

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const ACTIVE_PROJECT_STATUSES = new Set(['planning', 'active', 'paused'])

export interface BlockedTask extends DashboardTask {
  blockers: string[]
}

export interface ProjectSummary {
  id: string
  name: string
  status: string
  total: number
  completed: number
  overdue: number
  blocked: number
  progress: number // 0–100
}

export interface DashboardData {
  pending: DashboardTask[]
  overdue: DashboardTask[]
  dueSoon: DashboardTask[]
  blocked: BlockedTask[]
  projects: ProjectSummary[]
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Ordena por vencimiento (sin fecha al final) y luego por prioridad */
export function byUrgency(a: DashboardTask, b: DashboardTask): number {
  const da = a.due_date ? parseDate(a.due_date).getTime() : Infinity
  const db = b.due_date ? parseDate(b.due_date).getTime() : Infinity
  return da - db || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
}

export function isTaskOverdue(task: DashboardTask, today: Date): boolean {
  return task.status !== 'completed' && !!task.due_date && parseDate(task.due_date) < startOfDay(today)
}

export function isTaskDueSoon(task: DashboardTask, today: Date, days = 7): boolean {
  if (task.status === 'completed' || !task.due_date) return false
  const due = parseDate(task.due_date)
  const start = startOfDay(today)
  const end = new Date(start)
  end.setDate(end.getDate() + days)
  return due >= start && due <= end
}

export function blockersOf(taskId: string, deps: Dependency[], byId: Map<string, DashboardTask>): string[] {
  return deps
    .filter((d) => d.task_id === taskId)
    .map((d) => byId.get(d.depends_on_task_id))
    .filter((t): t is DashboardTask => !!t && t.status !== 'completed')
    .map((t) => t.title)
}

/**
 * @param scope 'mine' = solo tareas asignadas al usuario; 'team' = todas las del equipo.
 * Los resúmenes de proyecto siempre usan todas las tareas del proyecto.
 */
export function buildDashboard(
  tasks: DashboardTask[],
  deps: Dependency[],
  userId: string | undefined,
  scope: 'mine' | 'team',
  today: Date = new Date()
): DashboardData {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const inScope = tasks.filter(
    (t) => ACTIVE_PROJECT_STATUSES.has(t.project.status) && (scope === 'team' || t.assigned_to === userId)
  )
  const open = inScope.filter((t) => t.status !== 'completed')

  const blocked: BlockedTask[] = open
    .map((t) => ({ ...t, blockers: blockersOf(t.id, deps, byId) }))
    .filter((t) => t.blockers.length > 0)
    .sort(byUrgency)

  const projectsMap = new Map<string, ProjectSummary>()
  for (const t of tasks) {
    if (!ACTIVE_PROJECT_STATUSES.has(t.project.status)) continue
    const p =
      projectsMap.get(t.project.id) ??
      { id: t.project.id, name: t.project.name, status: t.project.status, total: 0, completed: 0, overdue: 0, blocked: 0, progress: 0 }
    p.total += 1
    if (t.status === 'completed') p.completed += 1
    if (isTaskOverdue(t, today)) p.overdue += 1
    if (t.status !== 'completed' && blockersOf(t.id, deps, byId).length > 0) p.blocked += 1
    projectsMap.set(p.id, p)
  }
  const projects = [...projectsMap.values()]
    .map((p) => ({ ...p, progress: p.total ? Math.round((p.completed / p.total) * 100) : 0 }))
    // Primero los que más necesitan atención
    .sort((a, b) => b.overdue + b.blocked - (a.overdue + a.blocked) || a.name.localeCompare(b.name))

  return {
    pending: [...open].sort(byUrgency),
    overdue: open.filter((t) => isTaskOverdue(t, today)).sort(byUrgency),
    dueSoon: open.filter((t) => isTaskDueSoon(t, today)).sort(byUrgency),
    blocked,
    projects,
  }
}
