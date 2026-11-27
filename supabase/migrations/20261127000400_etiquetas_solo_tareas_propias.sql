-- TEKO V2 — Etiquetar una tarea sigue la misma regla que editarla:
-- Owner/Admin/Líder cualquiera; Miembro solo las suyas (asignadas o creadas por él).

create or replace function private.can_edit_task(p_task uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from tasks t
    where t.id = p_task
      and (
        private.project_role_of(t.project_id) in ('owner', 'admin', 'leader')
        or (private.project_role_of(t.project_id) = 'member'
            and (t.assigned_to = auth.uid() or t.created_by = auth.uid()))
      )
  );
$$;

revoke all on function private.can_edit_task(uuid) from public, anon;
grant execute on function private.can_edit_task(uuid) to authenticated;

drop policy task_labels_insert on public.task_labels;
drop policy task_labels_delete on public.task_labels;

create policy task_labels_insert on public.task_labels for insert to authenticated
  with check (
    private.can_edit_task(task_id)
    and exists (
      select 1 from labels l
      where l.id = task_labels.label_id
        and l.team_id = private.project_team(private.task_project(task_id))
    )
  );

create policy task_labels_delete on public.task_labels for delete to authenticated
  using (private.can_edit_task(task_id));
