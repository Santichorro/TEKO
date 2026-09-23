export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'completed'

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  project_id: string
  column_id: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  created_by: string
  assigned_to: string | null
  start_date: string | null
  due_date: string | null
  blocked_reason: string | null
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TaskWithAssignee extends Task {
  assignee: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}