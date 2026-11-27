import { supabase } from '../supabase'
import type { Dependency } from './dependencies'
import type { ActivityEntry } from '../../types/activity'
import type { ProjectStatus } from '../../types/project'
import type { TaskPriority, TaskStatus } from '../../types/task'

export interface DashboardTask {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  assigned_to: string | null
  updated_at: string
  project: { id: string; name: string; status: ProjectStatus }
}

/** Tareas principales de todos los proyectos visibles del equipo (RLS filtra el resto) */
export async function fetchTeamTasks(teamId: string): Promise<DashboardTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, assigned_to, updated_at, project:projects!inner ( id, name, status, team_id )')
    .eq('project.team_id', teamId)
    .is('parent_task_id', null)

  if (error) throw new Error(`No se pudieron cargar las tareas: ${error.message}`)
  return (data ?? []) as unknown as DashboardTask[]
}

export async function fetchTeamDependencies(teamId: string): Promise<Dependency[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('task_id, depends_on_task_id, task:tasks!task_dependencies_task_id_fkey!inner ( project:projects!inner ( team_id ) )')
    .eq('task.project.team_id', teamId)

  if (error) throw new Error(`No se pudieron cargar las dependencias: ${error.message}`)
  return (data ?? []).map((d) => ({ task_id: d.task_id, depends_on_task_id: d.depends_on_task_id }))
}

export async function fetchTeamActivity(teamId: string, limit = 12): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, project_id, task_id, action, metadata, created_at, actor:profiles!activity_logs_actor_id_fkey ( id, name, avatar_url )')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`No se pudo cargar la actividad: ${error.message}`)
  return (data ?? []) as unknown as ActivityEntry[]
}
