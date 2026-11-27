-- TEKO V2 — Sacar de la API las funciones internas (aviso del Security Advisor).
-- Las auxiliares de RLS pasan al esquema "private", que PostgREST no expone.
-- Las políticas siguen funcionando: apuntan a la función, no a su nombre.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.team_role_of(uuid)                      set schema private;
alter function public.is_team_member(uuid)                    set schema private;
alter function public.has_team_role(uuid, public.team_role[]) set schema private;
alter function public.project_team(uuid)                      set schema private;
alter function public.task_project(uuid)                      set schema private;
alter function public.can_view_project(uuid)                  set schema private;
alter function public.project_role_of(uuid)                   set schema private;

-- Los cuerpos que se llaman entre sí ahora apuntan a private.*
create or replace function private.has_team_role(p_team uuid, p_roles public.team_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(private.team_role_of(p_team) = any (p_roles), false);
$$;

create or replace function private.can_view_project(p_project uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project
      and private.is_team_member(p.team_id)
      and (
        p.visibility = 'team'
        or private.has_team_role(p.team_id, array['owner', 'admin']::public.team_role[])
        or exists (select 1 from project_members pm where pm.project_id = p.id and pm.user_id = auth.uid())
      )
  );
$$;

create or replace function private.project_role_of(p_project uuid)
returns public.team_role
language sql stable security definer set search_path = public
as $$
  select private.team_role_of(private.project_team(p_project));
$$;

-- Funciones de negocio que usaban las auxiliares
create or replace function public.create_project(
  p_team_id uuid,
  p_name text,
  p_description text,
  p_start_date date,
  p_due_date date,
  p_leader_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_project uuid;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not private.has_team_role(p_team_id, array['owner', 'admin', 'leader']::team_role[]) then
    raise exception 'No tienes permiso para crear proyectos en este equipo.';
  end if;
  if not exists (select 1 from team_members where team_id = p_team_id and user_id = p_leader_id) then
    raise exception 'El líder debe ser miembro del equipo.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre del proyecto no puede estar vacío.';
  end if;
  if p_start_date is not null and p_due_date is not null and p_start_date > p_due_date then
    raise exception 'La fecha de inicio no puede ser posterior a la fecha límite.';
  end if;

  insert into projects (team_id, name, description, status, start_date, due_date, visibility, created_by)
  values (p_team_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), 'planning',
          p_start_date, p_due_date, 'team', v_user)
  returning id into v_project;

  insert into project_members (project_id, user_id, role) values (v_project, p_leader_id, 'leader');

  return v_project;
end;
$$;

create or replace function public.guard_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role team_role;
begin
  if auth.uid() is null then
    return new; -- llamadas internas / SQL Editor
  end if;
  if new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  v_role := private.project_role_of(new.project_id);
  if v_role in ('owner', 'admin', 'leader') then
    return new;
  end if;
  -- Miembro: solo puede tomar la tarea para sí o soltarla
  if v_role = 'member' and (new.assigned_to = auth.uid() or (new.assigned_to is null and old.assigned_to = auth.uid())) then
    return new;
  end if;

  raise exception 'Solo líderes y administradores pueden asignar tareas a otras personas.';
end;
$$;

-- Permisos: las auxiliares solo para usuarios con sesión (las usan las políticas)
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Las funciones de trigger nunca se llaman directo
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.guard_task_assignment() from public, anon, authenticated;
revoke all on function public.guard_subtask_project() from public, anon, authenticated;
revoke all on function public.set_updated_at()        from public, anon, authenticated;
