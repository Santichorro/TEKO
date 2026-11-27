import { supabase } from '../supabase'
import type { TaskListItem, TaskPriority, TaskStatus, TaskWithAssignee } from '../../types/task'

export const TASK_FIELDS = `
  id, project_id, column_id, parent_task_id, title, description, status, priority,
  created_by, assigned_to, start_date, due_date, blocked_reason, position,
  created_at, updated_at, completed_at,
  assignee:profiles!tasks_assigned_to_fkey ( id, name, avatar_url )
`

/** Campos de tarea + etiquetas para listas y detalle */
const TASK_LIST_FIELDS = `
  ${TASK_FIELDS},
  task_labels ( label:labels ( id, name, color ) )
`

type SubtaskStatus = { id: string; status: TaskStatus; parent_task_id: string }

/**
 * Las subtareas se traen en una consulta aparte (id, estado y padre) y se
 * agrupan aquí: el embed de una tabla consigo misma en PostgREST es ambiguo.
 */
async function attachSubtasks(
  tasks: Omit<TaskListItem, 'subtasks'>[],
  filter: { projectId: string } | { parentId: string }
): Promise<TaskListItem[]> {
  let query = supabase.from('tasks').select('id, status, parent_task_id').not('parent_task_id', 'is', null)
  query = 'projectId' in filter ? query.eq('project_id', filter.projectId) : query.eq('parent_task_id', filter.parentId)
  const { data, error } = await query
  if (error) throw new Error(`No se pudieron cargar las subtareas: ${error.message}`)

  const byParent = new Map<string, { id: string; status: TaskStatus }[]>()
  for (const sub of (data ?? []) as SubtaskStatus[]) {
    const list = byParent.get(sub.parent_task_id) ?? []
    list.push({ id: sub.id, status: sub.status })
    byParent.set(sub.parent_task_id, list)
  }
  return tasks.map((t) => ({ ...t, subtasks: byParent.get(t.id) ?? [] }))
}

export async function fetchProjectTasks(projectId: string): Promise<TaskListItem[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_LIST_FIELDS)
    .eq('project_id', projectId)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar las tareas: ${error.message}`)
  }

  const tasks = (data ?? []) as unknown as Omit<TaskListItem, 'subtasks'>[]
  return attachSubtasks(tasks, { projectId })
}

export async function fetchTask(taskId: string): Promise<TaskListItem | null> {
  const { data, error } = await supabase.from('tasks').select(TASK_LIST_FIELDS).eq('id', taskId).maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar la tarea: ${error.message}`)
  }

  if (!data) return null
  const [task] = await attachSubtasks([data as unknown as Omit<TaskListItem, 'subtasks'>], { parentId: taskId })
  return task
}

/** Subtareas de una tarea, en el orden en que se crearon */
export async function fetchSubtasks(parentTaskId: string): Promise<TaskWithAssignee[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_FIELDS)
    .eq('parent_task_id', parentTaskId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar las subtareas: ${error.message}`)
  }

  return (data ?? []) as unknown as TaskWithAssignee[]
}

export async function createSubtask(
  parent: { id: string; project_id: string },
  createdBy: string,
  title: string
): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('El título de la subtarea no puede estar vacío.')

  const { error } = await supabase.from('tasks').insert({
    project_id: parent.project_id,
    parent_task_id: parent.id,
    title: trimmed,
    status: 'todo',
    priority: 'medium',
    created_by: createdBy,
  })

  if (error) {
    throw new Error(`No se pudo crear la subtarea: ${error.message}`)
  }
}

/** Marca una tarea (o subtarea) como completada o la devuelve a "Por hacer" */
export async function setTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: completed ? 'completed' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) {
    throw new Error(`No se pudo actualizar la subtarea: ${error.message}`)
  }
}

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  start_date: string | null
  due_date: string | null
}

function validateTaskInput(input: TaskInput) {
  const title = input.title.trim()
  if (!title) throw new Error('El título de la tarea no puede estar vacío.')
  if (input.start_date && input.due_date && input.start_date > input.due_date) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha límite.')
  }
  return {
    title,
    description: input.description.trim() || null,
    status: input.status,
    priority: input.priority,
    assigned_to: input.assigned_to,
    start_date: input.start_date,
    due_date: input.due_date,
  }
}

export async function createTask(
  projectId: string,
  createdBy: string,
  input: TaskInput
): Promise<TaskWithAssignee> {
  const values = validateTaskInput(input)

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...values,
      project_id: projectId,
      created_by: createdBy,
      completed_at: values.status === 'completed' ? new Date().toISOString() : null,
    })
    .select(TASK_FIELDS)
    .single()

  if (error) {
    throw new Error(`No se pudo crear la tarea: ${error.message}`)
  }

  return data as unknown as TaskWithAssignee
}

export async function updateTask(
  taskId: string,
  previousStatus: TaskStatus,
  input: TaskInput
): Promise<void> {
  const values = validateTaskInput(input)

  // completed_at solo cambia cuando la tarea entra o sale de "Completado"
  const completedPatch =
    values.status === previousStatus
      ? {}
      : { completed_at: values.status === 'completed' ? new Date().toISOString() : null }

  const { error } = await supabase
    .from('tasks')
    .update({ ...values, ...completedPatch })
    .eq('id', taskId)

  if (error) {
    throw new Error(`No se pudo actualizar la tarea: ${error.message}`)
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    throw new Error(`No se pudo eliminar la tarea: ${error.message}`)
  }
}

export function groupTasksByStatus<T extends TaskWithAssignee>(tasks: T[]): Record<TaskStatus, T[]> {
  const groups: Record<TaskStatus, T[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    completed: [],
  }
  for (const task of tasks) {
    groups[task.status].push(task)
  }
  return groups
}

export type TeamTaskItem = Omit<TaskListItem, 'subtasks'> & {
  project: { id: string; name: string; status: string }
}

/** Tareas principales de todos los proyectos visibles de un equipo, con proyecto y etiquetas */
export async function fetchTeamTaskList(teamId: string): Promise<TeamTaskItem[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      ${TASK_FIELDS},
      task_labels ( label:labels ( id, name, color ) ),
      project:projects!inner ( id, name, status, team_id )
    `)
    .eq('project.team_id', teamId)
    .is('parent_task_id', null)

  if (error) throw new Error(`No se pudieron cargar las tareas: ${error.message}`)
  return (data ?? []) as unknown as TeamTaskItem[]
}

/** Reprogramar (calendario). Si la nueva fecha queda antes del inicio, se quita el inicio. */
export async function rescheduleTask(
  taskId: string,
  dueDate: string | null,
  startDate: string | null
): Promise<void> {
  const patch: { due_date: string | null; start_date?: null } = { due_date: dueDate }
  if (dueDate && startDate && startDate > dueDate) patch.start_date = null

  const { error } = await supabase.from('tasks').update(patch).eq('id', taskId).select('id').single()
  if (error) {
    throw new Error(
      error.code === 'PGRST116' ? 'No tienes permiso para reprogramar esta tarea.' : `No se pudo reprogramar: ${error.message}`
    )
  }
}
