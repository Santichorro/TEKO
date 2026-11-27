import { supabase } from '../supabase'
import type { TaskPriority, TaskStatus, TaskWithAssignee } from '../../types/task'

const TASK_FIELDS = `
  id, project_id, column_id, parent_task_id, title, description, status, priority,
  created_by, assigned_to, start_date, due_date, blocked_reason, position,
  created_at, updated_at, completed_at,
  assignee:profiles!tasks_assigned_to_fkey ( id, name, avatar_url )
`

export async function fetchProjectTasks(projectId: string): Promise<TaskWithAssignee[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_FIELDS)
    .eq('project_id', projectId)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar las tareas: ${error.message}`)
  }

  return (data ?? []) as unknown as TaskWithAssignee[]
}

export async function fetchTask(taskId: string): Promise<TaskWithAssignee | null> {
  const { data, error } = await supabase.from('tasks').select(TASK_FIELDS).eq('id', taskId).maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar la tarea: ${error.message}`)
  }

  return data as unknown as TaskWithAssignee | null
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

export function groupTasksByStatus(
  tasks: TaskWithAssignee[]
): Record<TaskStatus, TaskWithAssignee[]> {
  const groups: Record<TaskStatus, TaskWithAssignee[]> = {
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
