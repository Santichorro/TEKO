-- TEKO V2 — Crear equipo y crear proyecto en una sola transacción.
-- Reemplaza las dos inserciones que hacía el navegador (que podían dejar
-- equipos o proyectos huérfanos si fallaba la segunda).
-- Ejecutar en Supabase → SQL Editor. Es seguro correrlo más de una vez.

-- 1) Crear equipo + Owner -------------------------------------------------
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_team uuid;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre del equipo no puede estar vacío.';
  end if;

  insert into teams (name, owner_id)
  values (trim(p_name), v_user)
  returning id into v_team;

  insert into team_members (team_id, user_id, role)
  values (v_team, v_user, 'owner');

  return v_team;
end;
$$;

revoke all on function public.create_team(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;

-- 2) Crear proyecto + líder -------------------------------------------------
-- Solo Owner / Admin / Líder del equipo pueden crear (matriz de permisos).
-- El líder elegido debe ser miembro del equipo.
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

  if not exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = v_user
      and role in ('owner', 'admin', 'leader')
  ) then
    raise exception 'No tienes permiso para crear proyectos en este equipo.';
  end if;

  if not exists (
    select 1 from team_members where team_id = p_team_id and user_id = p_leader_id
  ) then
    raise exception 'El líder debe ser miembro del equipo.';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre del proyecto no puede estar vacío.';
  end if;

  if p_start_date is not null and p_due_date is not null and p_start_date > p_due_date then
    raise exception 'La fecha de inicio no puede ser posterior a la fecha límite.';
  end if;

  insert into projects (team_id, name, description, status, start_date, due_date, visibility)
  values (p_team_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), 'planning',
          p_start_date, p_due_date, 'team')
  returning id into v_project;

  insert into project_members (project_id, user_id, role)
  values (v_project, p_leader_id, 'leader');

  return v_project;
end;
$$;

revoke all on function public.create_project(uuid, text, text, date, date, uuid) from public, anon;
grant execute on function public.create_project(uuid, text, text, date, date, uuid) to authenticated;
