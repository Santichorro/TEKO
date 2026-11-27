-- TEKO V2 — Funciones de negocio (se llaman con supabase.rpc desde la app)

-- ===========================================================================
-- create_team: equipo + Owner en una sola transacción
-- ===========================================================================
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

  insert into teams (name, owner_id) values (trim(p_name), v_user) returning id into v_team;
  insert into team_members (team_id, user_id, role) values (v_team, v_user, 'owner');

  return v_team;
end;
$$;

-- ===========================================================================
-- create_project: proyecto + líder; solo Owner/Admin/Líder del equipo
-- ===========================================================================
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
  if not public.has_team_role(p_team_id, array['owner', 'admin', 'leader']::team_role[]) then
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

-- ===========================================================================
-- Invitaciones: el token viaja en el link; en la tabla solo está su SHA-256
-- ===========================================================================
create or replace function public.hash_invitation_token(p_token text)
returns text
language sql immutable
set search_path = public
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- Vista previa pública (también sin sesión) para mostrar "Te invitaron a X"
create or replace function public.get_invitation_preview(p_token text)
returns table (team_name text, role team_role, email text, expires_at timestamptz, accepted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select t.name, i.role, i.email, i.expires_at, i.accepted_at
  from invitations i
  join teams t on t.id = i.team_id
  where i.token_hash = public.hash_invitation_token(p_token);
$$;

-- Aceptar: exige sesión con el MISMO correo invitado, invitación vigente y sin usar
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_inv invitations%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para aceptar la invitación.';
  end if;

  select * into v_inv
  from invitations
  where token_hash = public.hash_invitation_token(p_token)
  for update;

  if not found then
    raise exception 'Invitación no encontrada.';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'Esta invitación ya fue utilizada.';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Esta invitación expiró.';
  end if;

  select lower(email) into v_email from auth.users where id = v_user;
  if v_email is distinct from v_inv.email then
    raise exception 'Esta invitación es para %. Inicia sesión con ese correo.', v_inv.email;
  end if;

  insert into team_members (team_id, user_id, role)
  values (v_inv.team_id, v_user, v_inv.role)
  on conflict (team_id, user_id) do nothing;

  -- Invitación a un proyecto concreto: también lo agrega al proyecto
  if v_inv.project_id is not null then
    insert into project_members (project_id, user_id, role)
    values (v_inv.project_id, v_user, 'member')
    on conflict (project_id, user_id) do nothing;
  end if;

  update invitations set accepted_at = now() where id = v_inv.id;

  return v_inv.team_id;
end;
$$;

-- ===========================================================================
-- Tareas: solo Owner/Admin/Líder pueden asignar o reasignar a otra persona
-- (RLS no compara valor viejo vs nuevo; este trigger sí)
-- ===========================================================================
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

  v_role := public.project_role_of(new.project_id);
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

create trigger guard_task_assignment
  before update of assigned_to on public.tasks
  for each row execute function public.guard_task_assignment();

-- Las subtareas deben estar en el mismo proyecto que su tarea padre
create or replace function public.guard_subtask_project()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_task_id is not null
     and (select project_id from tasks where id = new.parent_task_id) is distinct from new.project_id then
    raise exception 'La subtarea debe pertenecer al mismo proyecto que su tarea padre.';
  end if;
  return new;
end;
$$;

create trigger guard_subtask_project
  before insert or update of parent_task_id, project_id on public.tasks
  for each row execute function public.guard_subtask_project();

-- ===========================================================================
-- Quién puede ejecutar qué
-- ===========================================================================
revoke all on function public.create_team(text) from public, anon;
revoke all on function public.create_project(uuid, text, text, date, date, uuid) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.create_project(uuid, text, text, date, date, uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;
