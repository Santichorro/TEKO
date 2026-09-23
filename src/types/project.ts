export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'template'

export type ProjectMemberRole = 'leader' | 'member' | 'observer'

export interface Project {
  id: string
  team_id: string
  name: string
  description: string | null
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  visibility: 'team' | 'private'
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: ProjectMemberRole
  joined_at: string
}

export interface ProjectWithLeader extends Project {
  leader: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  member_count: number
}

export interface ProjectMemberWithProfile {
  user_id: string
  role: ProjectMemberRole
  joined_at: string
  profile: {
    id: string
    name: string
    email: string
    avatar_url: string | null
  }
}