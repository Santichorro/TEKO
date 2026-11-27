# TEKO V2

Organizador de proyectos colaborativo para equipos pequeños.
Stack: React + TypeScript + Vite + Tailwind v4 · TanStack Query · Supabase (Auth + PostgreSQL + RLS) · Cloudflare Workers.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y pon la URL y la clave de tu proyecto de Supabase
npm run dev                  # http://localhost:5173
```

Scripts: `npm run build` (TypeScript + build de producción), `npm run lint`, `npm run preview`.

## Estructura

```
src/
  components/ui/   sistema visual (Día 2): Button, Input, Card, Modal, AppShell…
  components/      piezas de dominio (equipos, tareas)
  context/         AuthProvider, TeamsProvider
  layouts/         Applayout: sidebar + topbar de las rutas protegidas
  lib/             cliente de Supabase, permisos, fechas, consultas (lib/queries)
  pages/           una página por ruta
  services/        equipos e invitaciones
  types/           tipos de proyectos y tareas
supabase/
  migrations/      SQL que hay que ejecutar en Supabase, en orden
  revisar_rls.sql  diagnóstico de seguridad (solo lectura)
wrangler.jsonc     configuración del despliegue en Cloudflare
```

## Supabase

1. Proyecto: **TEKO V2** (`vouaahbsoiwwaptwbyuv`, us-east-1). Las migraciones de `supabase/migrations/`
   ya están aplicadas. En un proyecto nuevo se ejecutan en orden en el **SQL Editor**.
2. **Authentication → URL Configuration**
   - Site URL: la URL de producción (p. ej. `https://teko.<tu-subdominio>.workers.dev`).
   - Redirect URLs: `http://localhost:5173/**` y `https://<url-de-produccion>/**`.
     Sin esto fallan la recuperación de contraseña y el link de confirmación de correo.
3. Todo cambio de base de datos va como un archivo nuevo en `supabase/migrations/` (nunca editar uno ya aplicado).

## Despliegue (Cloudflare Workers)

1. Cloudflare → **Workers & Pages → Create → Import a repository** → elegir este repo y la rama.
2. Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
3. **Settings → Build → Variables and secrets**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (Vite las incrusta al compilar, por eso van como variables de *build*).
4. Al terminar, copiar la URL `*.workers.dev` a Supabase (paso 2 de arriba).
