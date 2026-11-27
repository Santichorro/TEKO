-- TEKO V2 — Día 9: Dependencias
-- "A depende de B" = (task_id = A, depends_on_task_id = B): A está bloqueada mientras B no esté completada.
-- 1) Sin ciclos: A → B → C → A se rechaza (y A → A ya lo impide un CHECK).
-- 2) Solo entre tareas principales del mismo proyecto.
-- 3) Una tarea bloqueada no puede avanzar a En progreso / En revisión / Completado.
-- 4) El bloqueo se calcula siempre en vivo: al completar B, A queda libre sola
--    y se registra 'task.unblocked' en la actividad.

-- ===========================================================================
-- Validación al crear una dependencia
-- ===========================================================================
create or replace function public.guard_task_dependency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task tasks%rowtype;
  v_dep tasks%rowtype;
begin
  select * into v_task from tasks where id = new.task_id;
  select * into v_dep from tasks where id = new.depends_on_task_id;

  if v_task.project_id is distinct from v_dep.project_id then
    raise exception 'Las dependencias solo pueden ser entre tareas del mismo proyecto.';
  end if;
  if v_task.parent_task_id is not null or v_dep.parent_task_id is not null then
    raise exception 'Las subtareas no pueden tener dependencias; usa la tarea principal.';
  end if;

  -- ¿Desde la tarea de la que se dependerá se puede llegar de vuelta a esta? => ciclo
  if exists (
    with recursive cadena(id) as (
      select depends_on_task_id from task_dependencies where task_id = new.depends_on_task_id
      union
      select d.depends_on_task_id from task_dependencies d join cadena c on d.task_id = c.id
    )
    select 1 from cadena where id = new.task_id
  ) or new.depends_on_task_id = new.task_id then
    raise exception 'No se puede: "%" ya depende (directa o indirectamente) de "%". Se formaría un ciclo.',
      v_dep.title, v_task.title;
  end if;

  return new;
end;
$$;

create trigger guard_task_dependency
  before insert or update on public.task_dependencies
  for each row execute function public.guard_task_dependency();

-- ===========================================================================
-- Una tarea bloqueada no puede avanzar
-- ===========================================================================
create or replace function public.guard_blocked_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blockers text;
begin
  if new.status in ('in_progress', 'in_review', 'completed')
     and new.status is distinct from old.status then
    select string_agg('"' || b.title || '"', ', ' order by b.title) into v_blockers
    from task_dependencies d
    join tasks b on b.id = d.depends_on_task_id
    where d.task_id = new.id and b.status <> 'completed';

    if v_blockers is not null then
      raise exception 'Tarea bloqueada: primero hay que completar %.', v_blockers;
    end if;
  end if;
  return new;
end;
$$;

-- Nombre con "z" para que corra después de sync_task_column (que fija el estado según la columna)
create trigger z_guard_blocked_task
  before update on public.tasks
  for each row execute function public.guard_blocked_task();

-- ===========================================================================
-- Desbloqueo automático: registrar en la actividad
-- ===========================================================================
create or replace function public.log_tasks_unblocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
  select p.team_id, t.project_id, t.id, auth.uid(), 'task.unblocked',
         jsonb_build_object('title', t.title, 'by', new.title)
  from task_dependencies d
  join tasks t on t.id = d.task_id
  join projects p on p.id = t.project_id
  where d.depends_on_task_id = new.id
    -- ya no le queda ningún bloqueo pendiente
    and not exists (
      select 1 from task_dependencies d2
      join tasks b on b.id = d2.depends_on_task_id
      where d2.task_id = t.id and b.status <> 'completed'
    );
  return new;
end;
$$;

create trigger log_tasks_unblocked
  after update on public.tasks
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.log_tasks_unblocked();

revoke all on function public.guard_task_dependency() from public, anon, authenticated;
revoke all on function public.guard_blocked_task()    from public, anon, authenticated;
revoke all on function public.log_tasks_unblocked()   from public, anon, authenticated;
