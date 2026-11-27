-- TEKO V2 — Seguridad: RLS en las 14 tablas según la matriz de permisos de la especificación.
-- Las funciones auxiliares son SECURITY DEFINER para que las políticas no se llamen
-- a sí mismas en bucle (p. ej. team_members consultando team_members).

-- ===========================================================================
-- Funciones auxiliares
-- ===========================================================================
create or replace function public.team_role_of(p_team uuid)
returns public.team_role
language sql stable security definer set search_path = public
as $$
  select role from team_members where team_id = p_team and user_id = auth.uid();
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from team_members where team_id = p_team and user_id = auth.uid());
$$;

create or replace function public.has_team_role(p_team uuid, p_roles public.team_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.team_role_of(p_team) = any (p_roles), false);
$$;

create or replace function public.project_team(p_project uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select team_id from projects where id = p_project;
$$;

create or replace function public.task_project(p_task uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select project_id from tasks where id = p_task;
$$;

-- Ver un proyecto: miembro del equipo y (proyecto visible para el equipo,
-- o soy Owner/Admin, o soy miembro del proyecto).
create or replace function public.can_view_project(p_project uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project
      and public.is_team_member(p.team_id)
      and (
        p.visibility = 'team'
        or public.has_team_role(p.team_id, array['owner', 'admin']::public.team_role[])
        or exists (select 1 from project_members pm where pm.project_id = p.id and pm.user_id = auth.uid())
      )
  );
$$;

-- Rol del usuario en el equipo dueño del proyecto (null si no pertenece)
create or replace function public.project_role_of(p_project uuid)
returns public.team_role
language sql stable security definer set search_path = public
as $$
  select public.team_role_of(public.project_team(p_project));
$$;

-- ===========================================================================
-- Activar RLS en todas las tablas
-- ===========================================================================
alter table public.profiles          enable row level security;
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;
alter table public.projects          enable row level security;
alter table public.project_members   enable row level security;
alter table public.columns           enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.labels            enable row level security;
alter table public.task_labels       enable row level security;
alter table public.comments          enable row level security;
alter table public.attachments       enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.invitations       enable row level security;

-- ===========================================================================
-- profiles: me veo a mí y a quienes comparten equipo conmigo
-- ===========================================================================
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from team_members mine
      join team_members theirs on theirs.team_id = mine.team_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ===========================================================================
-- teams (crear: solo con la función create_team)
-- ===========================================================================
create policy teams_select on public.teams for select to authenticated
  using (public.is_team_member(id));
create policy teams_update on public.teams for update to authenticated
  using (public.has_team_role(id, array['owner', 'admin']::public.team_role[]))
  with check (public.has_team_role(id, array['owner', 'admin']::public.team_role[]));
create policy teams_delete on public.teams for delete to authenticated
  using (public.has_team_role(id, array['owner']::public.team_role[]));

-- ===========================================================================
-- team_members (entrar: create_team o accept_invitation)
-- ===========================================================================
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_team_member(team_id));

-- Cambiar roles: Owner cambia a cualquiera menos al Owner; Admin solo a Líder/Miembro/Observador
create policy team_members_update on public.team_members for update to authenticated
  using (
    role <> 'owner'
    and (
      public.has_team_role(team_id, array['owner']::public.team_role[])
      or (public.has_team_role(team_id, array['admin']::public.team_role[]) and role in ('leader', 'member', 'observer'))
    )
  )
  with check (
    role <> 'owner'
    and (
      public.has_team_role(team_id, array['owner']::public.team_role[])
      or (public.has_team_role(team_id, array['admin']::public.team_role[]) and role in ('leader', 'member', 'observer'))
    )
  );

-- Salir del equipo (si no soy Owner) o expulsar a alguien de menor rango
create policy team_members_delete on public.team_members for delete to authenticated
  using (
    role <> 'owner'
    and (
      user_id = auth.uid()
      or public.has_team_role(team_id, array['owner']::public.team_role[])
      or (public.has_team_role(team_id, array['admin']::public.team_role[]) and role in ('leader', 'member', 'observer'))
    )
  );

-- ===========================================================================
-- projects (crear: función create_project)
-- ===========================================================================
create policy projects_select on public.projects for select to authenticated
  using (public.can_view_project(id));
create policy projects_update on public.projects for update to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]))
  with check (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]));
create policy projects_delete on public.projects for delete to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin']::public.team_role[]));

-- ===========================================================================
-- project_members: gestionan Owner/Admin/Líder; solo se agrega gente del equipo
-- ===========================================================================
create policy project_members_select on public.project_members for select to authenticated
  using (public.can_view_project(project_id));
create policy project_members_insert on public.project_members for insert to authenticated
  with check (
    public.project_role_of(project_id) in ('owner', 'admin', 'leader')
    and exists (
      select 1 from team_members tm
      where tm.team_id = public.project_team(project_id) and tm.user_id = project_members.user_id
    )
  );
create policy project_members_update on public.project_members for update to authenticated
  using (public.project_role_of(project_id) in ('owner', 'admin', 'leader'))
  with check (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));
create policy project_members_delete on public.project_members for delete to authenticated
  using (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));

-- ===========================================================================
-- columns (Kanban, Día 8): crear/eliminar Owner/Admin/Líder
-- ===========================================================================
create policy columns_select on public.columns for select to authenticated
  using (public.can_view_project(project_id));
create policy columns_insert on public.columns for insert to authenticated
  with check (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));
create policy columns_update on public.columns for update to authenticated
  using (public.project_role_of(project_id) in ('owner', 'admin', 'leader'))
  with check (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));
create policy columns_delete on public.columns for delete to authenticated
  using (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));

-- ===========================================================================
-- tasks
--   Crear: Owner/Admin/Líder/Miembro (Miembro solo sin asignar o asignada a sí mismo)
--   Editar: Owner/Admin/Líder cualquiera; Miembro solo las suyas
--   Eliminar: Owner/Admin/Líder
--   (Reasignar lo bloquea además el trigger guard_task_assignment)
-- ===========================================================================
create policy tasks_select on public.tasks for select to authenticated
  using (public.can_view_project(project_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.can_view_project(project_id)
    and created_by = auth.uid()
    and (
      public.project_role_of(project_id) in ('owner', 'admin', 'leader')
      or (public.project_role_of(project_id) = 'member' and (assigned_to is null or assigned_to = auth.uid()))
    )
  );
create policy tasks_update on public.tasks for update to authenticated
  using (
    public.can_view_project(project_id)
    and (
      public.project_role_of(project_id) in ('owner', 'admin', 'leader')
      or (public.project_role_of(project_id) = 'member' and (assigned_to = auth.uid() or created_by = auth.uid()))
    )
  )
  with check (
    public.can_view_project(project_id)
    and public.project_role_of(project_id) in ('owner', 'admin', 'leader', 'member')
  );
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.project_role_of(project_id) in ('owner', 'admin', 'leader'));

-- ===========================================================================
-- task_dependencies (Día 9): gestionan Owner/Admin/Líder
-- ===========================================================================
create policy task_dependencies_select on public.task_dependencies for select to authenticated
  using (public.can_view_project(public.task_project(task_id)));
create policy task_dependencies_insert on public.task_dependencies for insert to authenticated
  with check (
    public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader')
    and public.task_project(task_id) = public.task_project(depends_on_task_id)
  );
create policy task_dependencies_delete on public.task_dependencies for delete to authenticated
  using (public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader'));

-- ===========================================================================
-- labels (por equipo): todos los miembros las ven; gestionan Owner/Admin/Líder
-- ===========================================================================
create policy labels_select on public.labels for select to authenticated
  using (public.is_team_member(team_id));
create policy labels_insert on public.labels for insert to authenticated
  with check (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]));
create policy labels_update on public.labels for update to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]))
  with check (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]));
create policy labels_delete on public.labels for delete to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin', 'leader']::public.team_role[]));

-- ===========================================================================
-- task_labels: asignan etiquetas quienes pueden trabajar tareas
-- ===========================================================================
create policy task_labels_select on public.task_labels for select to authenticated
  using (public.can_view_project(public.task_project(task_id)));
create policy task_labels_insert on public.task_labels for insert to authenticated
  with check (
    public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader', 'member')
    and exists (
      select 1 from labels l
      where l.id = task_labels.label_id and l.team_id = public.project_team(public.task_project(task_id))
    )
  );
create policy task_labels_delete on public.task_labels for delete to authenticated
  using (public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader', 'member'));

-- ===========================================================================
-- comments (Día 10): comentan Owner/Admin/Líder/Miembro; cada quien edita/borra los suyos
-- ===========================================================================
create policy comments_select on public.comments for select to authenticated
  using (public.can_view_project(public.task_project(task_id)));
create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_view_project(public.task_project(task_id))
    and public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader', 'member')
  );
create policy comments_update on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (
    author_id = auth.uid()
    or public.project_role_of(public.task_project(task_id)) in ('owner', 'admin')
  );

-- ===========================================================================
-- attachments: adjuntan Owner/Admin/Líder/Miembro
-- ===========================================================================
create policy attachments_select on public.attachments for select to authenticated
  using (public.can_view_project(public.task_project(task_id)));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_view_project(public.task_project(task_id))
    and public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader', 'member')
  );
create policy attachments_delete on public.attachments for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.project_role_of(public.task_project(task_id)) in ('owner', 'admin', 'leader')
  );

-- ===========================================================================
-- activity_logs: todos los miembros la ven; solo se agrega, nunca se edita
-- ===========================================================================
create policy activity_logs_select on public.activity_logs for select to authenticated
  using (
    public.is_team_member(team_id)
    and (project_id is null or public.can_view_project(project_id))
  );
create policy activity_logs_insert on public.activity_logs for insert to authenticated
  with check (actor_id = auth.uid() and public.is_team_member(team_id));

-- ===========================================================================
-- invitations: las gestionan Owner/Admin (ver y aceptar: funciones del archivo siguiente)
-- ===========================================================================
create policy invitations_select on public.invitations for select to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin']::public.team_role[]));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    public.has_team_role(team_id, array['owner', 'admin']::public.team_role[])
    and invited_by = auth.uid()
    and role <> 'owner'
  );
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.has_team_role(team_id, array['owner', 'admin']::public.team_role[]));
