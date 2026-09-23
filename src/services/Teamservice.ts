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

/**
 * Crea un equipo nuevo y agrega automáticamente al usuario creador
 * como miembro con rol 'owner'.
 *
 * No se usa una sola inserción con default porque team_members necesita
 * el id del equipo recién creado (team_id es FK hacia teams.id).
 */
export async function createTeam(name: string, userId: string): Promise<Team> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('El nombre del equipo no puede estar vacío.');
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

  return team as Team;
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

  return (data ?? []).map((row: any) => ({
    ...row.teams,
    role: row.role as TeamRole,
  }));
}