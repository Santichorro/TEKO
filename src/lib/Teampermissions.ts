import type { TeamRole } from '../services/Teamservice';

/**
 * Acciones controladas por rol de equipo. Se mantienen granulares
 * (en vez de "puede editar todo") para que cada pantalla pida
 * exactamente el permiso que necesita.
 */
export type TeamPermission =
  | 'delete_team'          // eliminar el equipo completo
  | 'manage_team_settings' // renombrar equipo, configuración general
  | 'manage_roles'         // cambiar el rol de otros miembros
  | 'remove_members'       // expulsar miembros del equipo
  | 'invite_members'       // crear invitaciones
  | 'manage_projects'      // crear/editar/archivar proyectos del equipo
  | 'manage_tasks'         // crear/editar/mover tareas
  | 'assign_tasks'         // asignar o reasignar responsable
  | 'delete_tasks'         // eliminar tareas
  | 'comment'              // comentar en tareas
  | 'view';                // acceso de solo lectura

/**
 * Matriz de permisos. Owner y Admin quedan explícitos y separados
 * (en vez de "Admin hereda de Owner") porque hay una diferencia
 * de negocio real: Admin no puede eliminar el equipo ni tocar el
 * rol del Owner (eso se valida aparte en canChangeRole).
 */
const ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  owner: [
    'delete_team',
    'manage_team_settings',
    'manage_roles',
    'remove_members',
    'invite_members',
    'manage_projects',
    'manage_tasks',
    'assign_tasks',
    'delete_tasks',
    'comment',
    'view',
  ],
  admin: [
    'manage_team_settings',
    'manage_roles',
    'remove_members',
    'invite_members',
    'manage_projects',
    'manage_tasks',
    'assign_tasks',
    'delete_tasks',
    'comment',
    'view',
  ],
  leader: ['manage_projects', 'manage_tasks', 'assign_tasks', 'delete_tasks', 'comment', 'view'],
  member: ['manage_tasks', 'comment', 'view'],
  observer: ['view'],
};

/** Orden jerárquico, usado solo para reglas de "quién puede tocar a quién". */
const ROLE_RANK: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  leader: 2,
  member: 1,
  observer: 0,
};

export function hasPermission(role: TeamRole, permission: TeamPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Reglas de negocio para cambiar el rol de otro miembro:
 * - Solo Owner y Admin pueden cambiar roles (ver hasPermission('manage_roles')).
 * - Nadie puede modificar al Owner.
 * - Admin no puede ascender a nadie a Owner ni a su propio nivel (Admin).
 *   Solo el Owner puede crear otro Admin o transferir ownership.
 */
export function canChangeRole(
  actorRole: TeamRole,
  targetCurrentRole: TeamRole,
  targetNewRole: TeamRole
): boolean {
  if (!hasPermission(actorRole, 'manage_roles')) return false;
  if (targetCurrentRole === 'owner') return false; // el Owner no se toca por acá
  if (targetNewRole === 'owner') return false; // transferir ownership es un flujo aparte

  if (actorRole === 'owner') return true;

  // A partir de acá actorRole === 'admin'
  return targetNewRole !== 'admin' && ROLE_RANK[targetCurrentRole] < ROLE_RANK['admin'];
}

/** Un miembro puede expulsar a otro si tiene el permiso y no es de igual o mayor rango. */
export function canRemoveMember(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (targetRole === 'owner') return false;
  if (!hasPermission(actorRole, 'remove_members')) return false;
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

/**
 * Matriz de la especificación: Miembro edita tareas "con alcance limitado".
 * Aquí: Owner/Admin/Líder editan cualquier tarea; Miembro solo las suyas
 * (asignadas a él o creadas por él); Observador ninguna.
 * La regla definitiva debe repetirse en RLS (Día 13).
 */
export function canEditTask(
  role: TeamRole,
  userId: string | undefined,
  task: { assigned_to: string | null; created_by: string }
): boolean {
  if (!hasPermission(role, 'manage_tasks')) return false;
  if (hasPermission(role, 'assign_tasks')) return true;
  return !!userId && (task.assigned_to === userId || task.created_by === userId);
}
