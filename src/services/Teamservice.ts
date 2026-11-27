import { supabase } from '../lib/supabase';

export type TeamRole = 'owner' | 'admin' | 'leader' | 'member' | 'observer';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface TeamMemberWithProfile {
  user_id: string;
  role: TeamRole;
  joined_at: string;
  profile: Profile;
}

/**
 * Crea un equipo nuevo y agrega automáticamente al usuario creador
 * como miembro con rol 'owner'.
 *
 * No se usa una sola inserción con default porque team_members necesita
 * el id del equipo recién creado (team_id es FK hacia teams.id).
 */
export async function createTeam(name: string, userId: string): Promise<{ id: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('El nombre del equipo no puede estar vacío.');
  }

  // Camino preferido: función create_team en Postgres (una sola transacción).
  // Ver supabase/migrations/20261127000000_rpc_crear_equipo_y_proyecto.sql
  const { data: rpcTeamId, error: rpcError } = await supabase.rpc('create_team', { p_name: trimmedName });
  if (!rpcError) return { id: rpcTeamId as string };
  // PGRST202 = la función aún no existe en Supabase → se usa el método anterior
  if (rpcError.code !== 'PGRST202') {
    throw new Error(`No se pudo crear el equipo: ${rpcError.message}`);
  }

  // 1. Crear el equipo
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name: trimmedName, owner_id: userId })
    .select()
    .single();

  if (teamError) {
    throw new Error(`No se pudo crear el equipo: ${teamError.message}`);
  }

  // 2. Agregar al creador como Owner en team_members
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: userId, role: 'owner' });

  if (memberError) {
    // Si falla el segundo paso, revertimos el equipo para no dejar
    // un equipo huérfano sin ningún miembro.
    await supabase.from('teams').delete().eq('id', team.id);
    throw new Error(`No se pudo asignar el rol de Owner: ${memberError.message}`);
  }

  return { id: (team as Team).id };
}

/**
 * Devuelve todos los equipos a los que pertenece un usuario,
 * junto con el rol que tiene en cada uno. Se usa para el
 * selector de equipo (paso 3) y para la página de equipo.
 */
export async function getUserTeams(userId: string): Promise<TeamWithRole[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role, teams(*)')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`No se pudieron cargar los equipos: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as { role: TeamRole; teams: Team }[];
  return rows.map((row) => ({
    ...row.teams,
    role: row.role,
  }));
}

/**
 * Devuelve los miembros de un equipo con su perfil (nombre, email,
 * avatar) para mostrarlos en la lista de miembros (paso 5).
 */
export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id, role, joined_at, profile:profiles(id, name, email, avatar_url)')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar los miembros: ${error.message}`);
  }

  return (data ?? []) as unknown as TeamMemberWithProfile[];
}

export interface Invitation {
  id: string;
  team_id: string;
  project_id: string | null;
  email: string;
  role: TeamRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const INVITATION_EXPIRY_DAYS = 7;

/**
 * El token en claro solo existe en memoria del navegador durante
 * la creación (para armar el link de invitación). En la base de
 * datos siempre se guarda su hash SHA-256 (token_hash), tal como
 * pide la especificación: "los tokens de invitación se almacenan
 * como hash".
 */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface CreateInvitationResult {
  invitation: Invitation;
  /** Token en claro — úsalo para armar el link de invitación. No se puede recuperar después. */
  token: string;
}

/**
 * Crea una invitación al equipo. No envía correo (fuera de alcance
 * del MVP sin backend propio) — devuelve el token en claro una sola
 * vez para que quien invita copie/comparta el link manualmente.
 */
export async function createInvitation(
  teamId: string,
  email: string,
  role: TeamRole
): Promise<CreateInvitationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('El correo no puede estar vacío.');
  }
  if (role === 'owner') {
    throw new Error('No se puede invitar directamente con rol Owner.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .maybeSingle();

  if (existingError) {
    throw new Error(`No se pudo verificar invitaciones existentes: ${existingError.message}`);
  }
  if (existing) {
    throw new Error('Ya existe una invitación pendiente para este correo en este equipo.');
  }

  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({ team_id: teamId, email: normalizedEmail, role, token_hash: tokenHash, expires_at: expiresAt })
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo crear la invitación: ${error.message}`);
  }

  return { invitation: invitation as Invitation, token };
}

/** Invitaciones pendientes (sin aceptar) de un equipo, para mostrarlas en la página de equipo. */
export async function getPendingInvitations(teamId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`No se pudieron cargar las invitaciones: ${error.message}`);
  }

  return data as Invitation[];
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', invitationId);
  if (error) {
    throw new Error(`No se pudo cancelar la invitación: ${error.message}`);
  }
}

export interface InvitationPreview {
  team_name: string;
  role: TeamRole;
  email: string;
  expires_at: string;
  accepted_at: string | null;
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const { data, error } = await supabase.rpc('get_invitation_preview', { p_token: token });
  if (error) throw new Error(`No se pudo verificar la invitación: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Invitación no encontrada.');
  if (row.accepted_at) throw new Error('Esta invitación ya fue utilizada.');
  if (new Date(row.expires_at) < new Date()) throw new Error('Esta invitación expiró.');
  return row as InvitationPreview;
}

/** Devuelve el team_id del equipo al que se unió. */
export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}