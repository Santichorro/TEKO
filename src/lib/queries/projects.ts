import { supabase } from '../supabase'
import type { ProjectWithLeader, ProjectStatus } from '../../types/project'

export async function fetchTeamProjects(
  teamId: string,
  statuses: ProjectStatus[]
): Promise<ProjectWithLeader[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, team_id, name, description, status, start_date, due_date, visibility, created_at, updated_at,
      project_members!inner (
        role,
        profiles ( id, name, avatar_url )
      )
    `)
    .eq('team_id', teamId)
    .in('status', statuses)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((p) => {
    const leaderRow = p.project_members.find((m: any) => m.role === 'leader')
    return {
      ...p,
      leader: leaderRow?.profiles ?? null,
      member_count: p.project_members.length,
    }
  }) as unknown as ProjectWithLeader[]
}