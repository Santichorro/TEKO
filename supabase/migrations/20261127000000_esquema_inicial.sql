-- TEKO V2 — Esquema inicial (Día 3 rehecho en limpio)
-- 14 tablas: profiles, teams, team_members, projects, project_members, columns,
-- tasks, task_dependencies, labels, task_labels, comments, attachments,
-- activity_logs, invitations.

-- ===========================================================================
-- Tipos
-- ===========================================================================
create type public.team_role as enum ('owner', 'admin', 'leader', 'member', 'observer');
create type public.project_status as enum ('planning', 'active', 'paused', 'completed', 'archived', 'template');
create type public.project_member_role as enum ('leader', 'member', 'observer');
create type public.project_visibility as enum ('team', 'private');
create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'completed');
create type public.task_priority as enum ('urgent', 'high', 'medium', 'low');

-- ===========================================================================
-- updated_at automático
-- ===========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===========================================================================
-- Tablas
-- ===========================================================================
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null,
  avatar_url  text,
  timezone    text not null default 'America/Bogota',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.team_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);
-- Un solo Owner por equipo
create unique index team_members_one_owner on public.team_members (team_id) where role = 'owner';

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 160),
  description  text,
  status       public.project_status not null default 'planning',
  start_date   date,
  due_date     date,
  visibility   public.project_visibility not null default 'team',
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint projects_dates_check check (start_date is null or due_date is null or start_date <= due_date)
);
create index projects_team_idx on public.projects (team_id, status);

create table public.project_members (
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.project_member_role not null default 'member',
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);
-- Un solo líder por proyecto
create unique index project_members_one_leader on public.project_members (project_id) where role = 'leader';

create table public.columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  status      public.task_status,           -- columna "de sistema" ligada a un estado (Día 8)
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index columns_project_idx on public.columns (project_id, position);

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  column_id       uuid references public.columns (id) on delete set null,
  parent_task_id  uuid references public.tasks (id) on delete cascade,
  title           text not null check (char_length(trim(title)) between 1 and 200),
  description     text check (description is null or char_length(description) <= 5000),
  status          public.task_status not null default 'todo',
  priority        public.task_priority not null default 'medium',
  created_by      uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  assigned_to     uuid references public.profiles (id) on delete set null,
  start_date      date,
  due_date        date,
  blocked_reason  text,
  position        double precision not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  constraint tasks_dates_check check (start_date is null or due_date is null or start_date <= due_date),
  constraint tasks_not_own_parent check (parent_task_id is null or parent_task_id <> id)
);
create index tasks_project_idx on public.tasks (project_id, status, position);
create index tasks_assigned_idx on public.tasks (assigned_to);
create index tasks_parent_idx on public.tasks (parent_task_id);
create index tasks_column_idx on public.tasks (column_id, position);

create table public.task_dependencies (
  task_id             uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id  uuid not null references public.tasks (id) on delete cascade,
  created_by          uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id)
);
create index task_dependencies_depends_idx on public.task_dependencies (depends_on_task_id);

create table public.labels (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 40),
  color       text not null default 'accent',  -- 'ink' | 'surface' | 'accent' (paleta cerrada)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (team_id, name)
);

create table public.task_labels (
  task_id   uuid not null references public.tasks (id) on delete cascade,
  label_id  uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);
create index task_labels_label_idx on public.task_labels (label_id);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body        text not null check (char_length(trim(body)) between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index comments_task_idx on public.comments (task_id, created_at);

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  uploaded_by  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  file_path    text not null,   -- ruta en Supabase Storage
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  created_at   timestamptz not null default now()
);
create index attachments_task_idx on public.attachments (task_id);

create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  task_id     uuid references public.tasks (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  action      text not null,          -- p. ej. 'task.created', 'task.status_changed'
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_logs_project_idx on public.activity_logs (project_id, created_at desc);
create index activity_logs_task_idx on public.activity_logs (task_id, created_at desc);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  email        text not null check (email = lower(trim(email))),
  role         public.team_role not null default 'member' check (role <> 'owner'),
  token_hash   text not null unique,  -- SHA-256 en hex; el token en claro nunca se guarda
  invited_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
-- Una sola invitación pendiente por correo y equipo
create unique index invitations_one_pending on public.invitations (team_id, email) where accepted_at is null;

-- ===========================================================================
-- Triggers de updated_at
-- ===========================================================================
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.teams    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.columns  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.labels   for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.comments for each row execute function public.set_updated_at();

-- ===========================================================================
-- Perfil automático al registrarse (usa el "name" que envía signUp)
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Permisos base de la API (RLS decide qué filas; esto decide qué tablas)
-- ===========================================================================
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
