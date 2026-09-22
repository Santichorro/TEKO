import type { ReactNode } from 'react'

interface AppShellProps {
  sidebar: ReactNode
  topbar?: ReactNode
  children: ReactNode
}

/**
 * Divisores generados con grid gap de 1px sobre fondo ink (contraste) —
 * evita apilar bordes entre sidebar/topbar/contenido.
 */
export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  return (
    <div className="grid h-screen grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-px bg-ink">
      <div className="row-span-2">{sidebar}</div>
      {topbar && <div>{topbar}</div>}
      <main className="overflow-y-auto bg-surface p-6 sm:p-8">{children}</main>
    </div>
  )
}