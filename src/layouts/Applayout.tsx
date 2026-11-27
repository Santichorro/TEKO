import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/ui/Appshell'
import { Sidebar } from '../components/ui/Sidebar'
import { Topbar } from '../components/ui/Topbar'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Teamselector } from '../components/Teamselector'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'

const NAV_ITEMS = [
  { label: 'Inicio', path: '/dashboard' },
  { label: 'Proyectos', path: '/proyectos' },
  { label: 'Equipo', path: '/equipo' },
]

/** Layout de todas las rutas protegidas: sidebar con selector de equipo + topbar con la sesión. */
export function Applayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const { currentTeam } = useTeams()

  const userName = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? ''

  return (
    <AppShell
      sidebar={
        <Sidebar
          header={
            <div className="flex flex-col gap-4">
              <span className="font-display text-2xl uppercase tracking-tight">TEKO</span>
              <Teamselector />
            </div>
          }
          items={NAV_ITEMS.map((item) => ({
            label: item.label,
            active: pathname === item.path || pathname.startsWith(`${item.path}/`),
            onClick: () => navigate(item.path),
          }))}
        />
      }
      topbar={
        <Topbar
          title={currentTeam?.name ?? 'TEKO'}
          actions={
            <>
              <span className="flex items-center gap-2">
                <Avatar name={userName || 'Usuario'} />
                <span className="label hidden sm:inline">{userName}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                Cerrar sesión
              </Button>
            </>
          }
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}
