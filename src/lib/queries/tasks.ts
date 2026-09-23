import { supabase } from '../supabase'
import type { /*Task,*/ TaskStatus, TaskWithAssignee } from '../../types/task'

export async function fetchProjectTasks(projectId: string): Promise<TaskWithAssignee[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, project_id, column_id, parent_task_id, title, description, status, priority,
      created_by, assigned_to, start_date, due_date, blocked_reason, position,
      created_at, updated_at, completed_at,
      assignee:profiles!tasks_assigned_to_fkey ( id, name, avatar_url )
    `)
    .eq('project_id', projectId)
    .is('parent_task_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar las tareas: ${error.message}`)
  }

  return (data ?? []) as unknown as TaskWithAssignee[]
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