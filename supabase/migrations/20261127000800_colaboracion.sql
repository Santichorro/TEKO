-- TEKO V2 — Día 10: Colaboración (comentarios + actividad)
-- La actividad la escribe la base de datos con triggers, así queda completa
-- aunque el cambio venga de cualquier pantalla (o de otra persona).
-- Ya existían: task.status_changed (Kanban) y task.unblocked (dependencias).
-- Se agregan: task.created, task.assigned, task.priority_changed, task.due_date_changed,
-- task.renamed, task.deleted, comment.added, dependency.added, dependency.removed.

-- ===========================================================================
-- Tareas: crear, asignar, prioridad, fecha, título, eliminar
-- (solo tareas principales: las subtareas harían ruido)
-- ===========================================================================
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_row tasks%rowtype;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  if v_row.parent_task_id is not null then
    return null;
  end if;

  -- Si el proyecto se está borrando en cascada ya no existe: no hay a quién registrar
  select team_id into v_team from projects where id = v_row.project_id;
  if v_team is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
    values (v_team, new.project_id, new.id, auth.uid(), 'task.created', jsonb_build_object('title', new.title));
    if new.assigned_to is not null then
      insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
      values (v_team, new.project_id, new.id, auth.uid(), 'task.assigned',
              jsonb_build_object('title', new.title, 'to', new.assigned_to,
                                 'to_name', (select name from profiles where id = new.assigned_to)));
    end if;

  elsif tg_op = 'UPDATE' then
    if new.assigned_to is distinct from old.assigned_to then
      insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
      values (v_team, new.project_id, new.id, auth.uid(), 'task.assigned',
              jsonb_build_object('title', new.title, 'to', new.assigned_to,
                                 'to_name', (select name from profiles where id = new.assigned_to)));
    end if;
    if new.priority is distinct from old.priority then
      insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
      values (v_team, new.project_id, new.id, auth.uid(), 'task.priority_changed',
              jsonb_build_object('title', new.title, 'from', old.priority, 'to', new.priority));
    end if;
    if new.due_date is distinct from old.due_date then
      insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
      values (v_team, new.project_id, new.id, auth.uid(), 'task.due_date_changed',
              jsonb_build_object('title', new.title, 'from', old.due_date, 'to', new.due_date));
    end if;
    if new.title is distinct from old.title then
      insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
      values (v_team, new.project_id, new.id, auth.uid(), 'task.renamed',
              jsonb_build_object('title', new.title, 'from', old.title));
    end if;

  elsif tg_op = 'DELETE' then
    -- task_id va vacío: la tarea ya no existe (su historial propio se borra con ella)
    insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
    values (v_team, old.project_id, null, auth.uid(), 'task.deleted', jsonb_build_object('title', old.title));
  end if;

  return null;
end;
$$;

create trigger log_task_activity
  after insert or update or delete on public.tasks
  for each row execute function public.log_task_activity();

-- ===========================================================================
-- Comentarios
-- ===========================================================================
create or replace function public.log_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
  select p.team_id, t.project_id, t.id, new.author_id, 'comment.added',
         jsonb_build_object('title', t.title, 'comment_id', new.id, 'excerpt', left(new.body, 140))
  from tasks t join projects p on p.id = t.project_id
  where t.id = new.task_id;
  return null;
end;
$$;

create trigger log_comment_activity
  after insert on public.comments
  for each row execute function public.log_comment_activity();

-- ===========================================================================
-- Dependencias
-- ===========================================================================
create or replace function public.log_dependency_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row task_dependencies%rowtype;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  insert into activity_logs (team_id, project_id, task_id, actor_id, action, metadata)
  select p.team_id, t.project_id, t.id, auth.uid(),
         case when tg_op = 'INSERT' then 'dependency.added' else 'dependency.removed' end,
         jsonb_build_object('title', t.title, 'depends_on', d.title)
  from tasks t
  join tasks d on d.id = v_row.depends_on_task_id
  join projects p on p.id = t.project_id
  where t.id = v_row.task_id;
  return null;
end;
$$;

create trigger log_dependency_activity
  after insert or delete on public.task_dependencies
  for each row execute function public.log_dependency_activity();

revoke all on function public.log_task_activity()       from public, anon, authenticated;
revoke all on function public.log_comment_activity()    from public, anon, authenticated;
revoke all on function public.log_dependency_activity() from public, anon, authenticated;

-- ===========================================================================
-- La actividad solo la escribe la base de datos (nadie puede inventar entradas)
-- ===========================================================================
drop policy if exists activity_logs_insert on public.activity_logs;
revoke insert, update, delete on public.activity_logs from authenticated;

-- ===========================================================================
-- Tiempo real para comentarios y actividad
-- ===========================================================================
alter table public.comments replica identity full;
alter table public.activity_logs replica identity full;
alter publication supabase_realtime add table public.comments, public.activity_logs;
