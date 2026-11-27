import { supabase } from '../supabase'
import type { Column } from '../../types/column'

export async function fetchProjectColumns(projectId: string): Promise<Column[]> {
  const { data, error } = await supabase
    .from('columns')
    .select('id, project_id, name, status, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar las columnas: ${error.message}`)
  return (data ?? []) as Column[]
}

/**
 * Mueve una tarea en el Kanban. La base de datos (trigger sync_task_column)
 * ajusta el estado según la columna, pone updated_at y registra la actividad.
 */
export async function moveTask(taskId: string, columnId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ column_id: columnId, position })
    .eq('id', taskId)
    .select('id')
    .single()

  if (error) {
    // PGRST116 = 0 filas: RLS no dejó modificarla
    throw new Error(
      error.code === 'PGRST116'
        ? 'No tienes permiso para mover esta tarea.'
        : error.code === 'P0001'
          ? error.message // regla de la base de datos (p. ej. tarea bloqueada), ya en español
          : `No se pudo mover la tarea: ${error.message}`
    )
  }
}
