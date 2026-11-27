-- TEKO V2 — Que el tablero de otras personas se entere cuando se agrega o quita una dependencia
alter table public.task_dependencies replica identity full;
alter publication supabase_realtime add table public.task_dependencies;
