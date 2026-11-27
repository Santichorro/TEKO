-- TEKO V2 — Diagnóstico de seguridad (solo lectura, no cambia nada).
-- Pégalo en Supabase → SQL Editor, ejecútalo y comparte los dos resultados
-- para revisar las políticas antes del Día 13.

-- A) Tablas de public SIN RLS activado (deberían ser 0 filas)
select c.relname as tabla_sin_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- B) Políticas existentes por tabla y operación
select tablename, policyname, cmd, roles, qual as usando, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
