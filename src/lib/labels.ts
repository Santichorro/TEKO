import type { TeamRole } from '../services/Teamservice'
import type { TaskPriority, TaskStatus } from '../types/task'

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  leader: 'Líder',
  member: 'Miembro',
  observer: 'Observador',
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  in_review: 'En revisión',
  completed: 'Completado',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'completed']

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const TASK_PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
