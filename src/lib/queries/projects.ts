import { supabase } from '../supabase'
import type { Project, ProjectStatus, ProjectWithLeader } from '../../types/project'
import { canTransition } from '../projectTransitions'

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

export interface CreateProjectInput {
  team_id: string
  name: string
  description: string
  start_date: string | null
  due_date: string | null
  leader_id: string
}

/**
 * Crea el proyecto y agrega al líder elegido como miembro con rol
 * 'leader' en project_members. Si falla la segunda parte, revierte
 * el proyecto para no dejarlo huérfano sin líder — mismo patrón que
 * createTeam en Teamservice.ts.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    throw new Error('El nombre del proyecto no puede estar vacío.')
  }
  if (input.start_date && input.due_date && input.start_date > input.due_date) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha límite.')
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      team_id: input.team_id,
      name: trimmedName,
      description: input.description.trim() || null,
      status: 'planning' as ProjectStatus,
      start_date: input.start_date,
      due_date: input.due_date,
      visibility: 'team',
    })
    .select()
    .single()

  if (projectError) {
    throw new Error(`No se pudo crear el proyecto: ${projectError.message}`)
  }

  const { error: memberError } = await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: input.leader_id, role: 'leader' })

  if (memberError) {
    await supabase.from('projects').delete().eq('id', project.id)
    throw new Error(`No se pudo asignar el líder: ${memberError.message}`)
  }

  return project as Project
}

/**
 * Valida la transición en el cliente antes de mandarla (mejor UX,
 * error inmediato). La validación real y definitiva debe vivir en
 * RLS/trigger en Supabase — esto no reemplaza esa capa de seguridad,
 * solo evita una llamada innecesaria cuando ya sabemos que fallará.
 */
export async function updateProjectStatus(
  projectId: string,
  currentStatus: ProjectStatus,
  nextStatus: ProjectStatus
): Promise<void> {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new Error(`No se puede pasar de "${currentStatus}" a "${nextStatus}".`)
  }

  const { error } = await supabase
    .from('projects')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    throw new Error(`No se pudo actualizar el estado: ${error.message}`)
  }
}

const ALL_STATUSES: ProjectStatus[] = [
  'planning',
  'active',
  'paused',
  'completed',
  'archived',
  'template',
]

export async function fetchProjectDetail(
  teamId: string,
  projectId: string
): Promise<ProjectWithLeader | null> {
  const projects = await fetchTeamProjects(teamId, ALL_STATUSES)
  return projects.find((p) => p.id === projectId) ?? null
}

export interface UpdateProjectInput {
  name: string
  description: string
  start_date: string | null
  due_date: string | null
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<void> {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    throw new Error('El nombre del proyecto no puede estar vacío.')
  }
  if (input.start_date && input.due_date && input.start_date > input.due_date) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha límite.')
  }

  const { error } = await supabase
    .from('projects')
    .update({
      name: trimmedName,
      description: input.description.trim() || null,
      start_date: input.start_date,
      due_date: input.due_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (error) {
    throw new Error(`No se pudo actualizar el proyecto: ${error.message}`)
  }
}

import type { ProjectMemberRole, ProjectMemberWithProfile } from '../../types/project'

export async function fetchProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('user_id, role, joined_at, profile:profiles(id, name, email, avatar_url)')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los miembros del proyecto: ${error.message}`)
  }

  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    role: row.role as ProjectMemberRole,
    joined_at: row.joined_at,
    profile: row.profile,
  }))
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectMemberRole
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId, role })

  if (error) {
    throw new Error(`No se pudo agregar al miembro: ${error.message}`)
  }
}

/**
 * No permite quitar al líder directamente — primero hay que
 * reasignar el liderazgo (cambiar el rol de otro miembro a 'leader',
 * lo que degrada al líder actual). Evita dejar el proyecto sin líder.
 */
export async function removeProjectMember(projectId: string, userId: string, role: ProjectMemberRole): Promise<void> {
  if (role === 'leader') {
    throw new Error('No puedes quitar al líder del proyecto. Reasigna el liderazgo primero.')
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`No se pudo quitar al miembro: ${error.message}`)
  }
}