export interface ActivityEntry {
  id: string
  project_id: string | null
  task_id: string | null
  action: string
  metadata: Record<string, string | null>
  created_at: string
  actor: { id: string; name: string; avatar_url: string | null } | null
}

export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author: { id: string; name: string; avatar_url: string | null } | null
}
