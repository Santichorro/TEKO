import { formatDate } from './dates'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from './labels'
import type { ActivityEntry } from '../types/activity'
import type { TaskPriority, TaskStatus } from '../types/task'

const status = (s: string | null | undefined) => (s ? (TASK_STATUS_LABEL[s as TaskStatus] ?? s) : '—')
const priority = (p: string | null | undefined) => (p ? (TASK_PRIORITY_LABEL[p as TaskPriority] ?? p) : '—')

/**
 * Texto de una entrada de actividad. `withTask` agrega el nombre de la tarea
 * (en la vista del proyecto); en el detalle de la tarea sobra.
 */
export function describeActivity(entry: ActivityEntry, withTask: boolean): string {
  const m = entry.metadata ?? {}
  const task = withTask && m.title ? ` "${m.title}"` : ''
  const enTask = withTask && m.title ? ` en "${m.title}"` : ''

  switch (entry.action) {
    case 'task.created':
      return `creó la tarea${task}`
    case 'task.deleted':
      return `eliminó la tarea "${m.title}"`
    case 'task.status_changed':
      return `movió${task || ' la tarea'} de ${status(m.from)} a ${status(m.to)}`
    case 'task.assigned':
      return m.to_name ? `asignó${task || ' la tarea'} a ${m.to_name}` : `quitó el responsable${enTask}`
    case 'task.priority_changed':
      return `cambió la prioridad${enTask} de ${priority(m.from)} a ${priority(m.to)}`
    case 'task.due_date_changed':
      return m.to ? `cambió la fecha límite${enTask} a ${formatDate(m.to)}` : `quitó la fecha límite${enTask}`
    case 'task.renamed':
      return `renombró "${m.from}" a "${m.title}"`
    case 'task.unblocked':
      return `desbloqueó${task || ' la tarea'} al completar "${m.by}"`
    case 'comment.added':
      return `comentó${enTask}: “${m.excerpt}”`
    case 'dependency.added':
      return `hizo que${task || ' la tarea'} dependa de "${m.depends_on}"`
    case 'dependency.removed':
      return `quitó la dependencia${enTask} de "${m.depends_on}"`
    default:
      return entry.action
  }
}
