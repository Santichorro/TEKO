import { supabase } from '../supabase'
import type { TaskListItem } from '../../types/task'

/** "task_id depende de depends_on_task_id" */
export interface Dependency {
  task_id: string
  depends_on_task_id: string
}

export async function fetchProjectDependencies(projectId: string): Promise<Dependency[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('task_id, depends_on_task_id, task:tasks!task_dependencies_task_id_fkey!inner ( project_id )')
    .eq('task.project_id', projectId)

  if (error) throw new Error(`No se pudieron cargar las dependencias: ${error.message}`)
  return (data ?? []).map((d) => ({ task_id: d.task_id, depends_on_task_id: d.depends_on_task_id }))
}

export async function addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId })

  if (error) {
    if (error.code === '23505') throw new Error('Esa dependencia ya existe.')
    if (error.code === '42501') throw new Error('No tienes permiso para gestionar dependencias.')
    // P0001: mensajes de las reglas de la base de datos (ciclos, otro proyecto…), ya en español
    throw new Error(error.code === 'P0001' ? error.message : `No se pudo agregar la dependencia: ${error.message}`)
  }
}

export async function removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId)

  if (error) throw new Error(`No se pudo quitar la dependencia: ${error.message}`)
}

/** Tareas de las que depende `taskId` y que aún no están completadas */
export function getBlockers(
  taskId: string,
  dependencies: Dependency[],
  tasksById: Map<string, TaskListItem>
): TaskListItem[] {
  return dependencies
    .filter((d) => d.task_id === taskId)
    .map((d) => tasksById.get(d.depends_on_task_id))
    .filter((t): t is TaskListItem => !!t && t.status !== 'completed')
}
