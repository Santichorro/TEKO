import { supabase } from '../supabase'
import type { ActivityEntry } from '../../types/activity'

const FIELDS = 'id, project_id, task_id, action, metadata, created_at, actor:profiles!activity_logs_actor_id_fkey ( id, name, avatar_url )'

export async function fetchTaskActivity(taskId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(FIELDS)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`No se pudo cargar la actividad: ${error.message}`)
  return (data ?? []) as unknown as ActivityEntry[]
}

export async function fetchProjectActivity(projectId: string, limit = 40): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(FIELDS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`No se pudo cargar la actividad: ${error.message}`)
  return (data ?? []) as unknown as ActivityEntry[]
}
