-- TEKO V2 — Día 8: Kanban
-- 1) Cada proyecto tiene 5 columnas de sistema (una por estado).
-- 2) Estado y columna siempre coinciden: mover de columna cambia el estado,
--    y cambiar el estado (desde el formulario) mueve de columna.
-- 3) Cada cambio de estado queda en activity_logs.
-- 4) Los cambios en tareas se emiten en tiempo real (Supabase Realtime).

-- ===========================================================================
-- Columnas de sistema
-- ===========================================================================
create unique index if not exists columns_one_per_status
  on public.columns (project_id, status) where status is not null;

create or replace function public.create_default_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into columns (project_id, name, status, position) values
    (new.id, 'Backlog',     'backlog',     1),
    (new.id, 'Por hacer',   'todo',        2),
    (new.id, 'En progreso', 'in_progress', 3),
    (new.id, 'En revisión', 'in_review',   4),
    (new.id, 'Completado',  'completed',   5)
  on conflict do nothing;
  return new;
end;
$$;

create trigger create_default_columns
  after insert on public.projects
  for each row execute function public.create_default_columns();

-- Proyectos que ya existían
insert into public.columns (project_id, name, status, position)
select p.id, c.name, c.status::public.task_status, c.position
from public.projects p
cross join (values
  ('Backlog', 'backlog', 1), ('Por hacer', 'todo', 2), ('En progreso', 'in_progress', 3),
  ('En revisión', 'in_review', 4), ('Completado', 'completed', 5)
) as c(name, status, position)
on conflict do nothing;

-- ===========================================================================
-- Sincronía estado <-> columna, posición inicial y completed_at
-- ===========================================================================
create or replace function public.sync_task_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status task_status;
  v_col uuid;
begin
  if new.parent_task_id is null then
    if tg_op = 'INSERT' then
      if new.column_id is not null then
        select status into v_status from columns where id = new.column_id and project_id = new.project_id;
        if not found then
          raise exception 'La columna no pertenece al proyecto de la tarea.';
        end if;
        if v_status is not null then
          new.status := v_status;
        end if;
      else
        select id into v_col from columns where project_id = new.project_id and status = new.status;
        new.column_id := v_col;
      end if;
      -- Tarea nueva: al final de su columna
      if new.position = 0 and new.column_id is not null then
        select coalesce(max(position), 0) + 1 into new.position
        from tasks where column_id = new.column_id and parent_task_id is null;
      end if;
    else
      if new.column_id is distinct from old.column_id and new.column_id is not null then
        -- Se movió de columna (Kanban): el estado sigue a la columna
        select status into v_status from columns where id = new.column_id and project_id = new.project_id;
        if not found then
          raise exception 'La columna no pertenece al proyecto de la tarea.';
        end if;
        if v_status is not null then
          new.status := v_status;
        end if;
      elsif new.status is distinct from old.status then
        -- Cambió el estado (formulario): la tarea pasa al final de la columna de ese estado
        select id into v_col from columns where project_id = new.project_id and status = new.status;
        if v_col is not null and v_col is distinct from new.column_id then
          new.column_id := v_col;
          select coalesce(max(position), 0) + 1 into new.position
          from tasks where column_id = v_col and parent_task_id is null;
        end if;
      end if;
    end if;
  end if;

  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger sync_task_column
  before insert or update on public.tasks
  for each row execute function public.sync_task_column();

-- Tareas que ya existían
update public.tasks t
set column_id = c.id
from public.columns c
where c.project_id = t.project_id
  and c.status = t.status
  and t.parent_task_id is null
  and t.column_id is null;

-- ===========================================================================
-- Actividad: cada cambio de estado de una tarea
-- ===========================================================================
create or replace function public.log_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
  select p.team_id, new.project_id, new.id, auth.uid(), 'task.status_changed',
         jsonb_build_object('from', old.status, 'to', new.status, 'title', new.title)
  from projects p
  where p.id = new.project_id;
  return new;
end;
$$;

create trigger log_task_status_change
  after update on public.tasks
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_task_status_change();

revoke all on function public.create_default_columns()   from public, anon, authenticated;
revoke all on function public.sync_task_column()         from public, anon, authenticated;
revoke all on function public.log_task_status_change()   from public, anon, authenticated;

-- ===========================================================================
-- Tiempo real: el tablero se actualiza cuando otra persona mueve tareas
-- (Realtime respeta RLS: cada quien solo recibe lo que puede ver)
-- ===========================================================================
alter table public.tasks replica identity full;
alter publication supabase_realtime add table public.tasks;
