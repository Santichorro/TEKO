import type { TaskStatus } from './task'

export interface Column {
  id: string
  project_id: string
  name: string
  /** Columna de sistema ligada a un estado (las 5 por defecto) */
  status: TaskStatus | null
  position: number
}
