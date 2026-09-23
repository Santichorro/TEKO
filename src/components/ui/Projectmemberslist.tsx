import { useCallback, useEffect, useState } from 'react'
import { useTeams } from '../../context/Teamscontext'
import { getTeamMembers } from '../../services/Teamservice'
import type { TeamMemberWithProfile } from '../../services/Teamservice'
import { fetchProjectMembers, addProjectMember, removeProjectMember } from '../../lib/queries/projects'
import type { ProjectMemberRole, ProjectMemberWithProfile } from '../../types/project'
import { hasPermission } from '../../lib/Teampermissions'
import { Badge } from './Badge'
import { Button } from './Button'
import { Select } from './Select'
import { ConfirmDialog } from './Confirmdialog'

interface ProjectMembersListProps {
  projectId: string
}

const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  leader: 'Líder',
  member: 'Miembro',
  observer: 'Observador',
}

export function Projectmemberslist({ projectId }: ProjectMembersListProps) {
  const { currentTeam } = useTeams()
  const canManage = currentTeam ? hasPermission(currentTeam.role, 'manage_projects') : false

  const [projectMembers, setProjectMembers] = useState<ProjectMemberWithProfile[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('member')
  const [adding, setAdding] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<ProjectMemberWithProfile | null>(null)

  const load = useCallback(async () => {
    if (!currentTeam) return
    setLoading(true)
    setError(null)
    try {
      const [pm, tm] = await Promise.all([
        fetchProjectMembers(projectId),
        getTeamMembers(currentTeam.id),
      ])
      setProjectMembers(pm)
      setTeamMembers(tm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los miembros.')
    } finally {
      setLoading(false)
    }
  }, [currentTeam, projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!currentTeam) return null
  if (loading) return <p className="label opacity-60">Cargando miembros...</p>
  if (error) return <p className="label text-red-500">{error}</p>

  const availableToAdd = teamMembers.filter(
    (tm) => !projectMembers.some((pm) => pm.user_id === tm.user_id)
  )

  async function handleAdd() {
    if (!selectedUserId) return
    setAdding(true)
    setError(null)
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole)
      setSelectedUserId('')
      setSelectedRole('member')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar al miembro.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove() {
    if (!pendingRemove) return
    setError(null)
    try {
      await removeProjectMember(projectId, pendingRemove.user_id, pendingRemove.role)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar al miembro.')
    } finally {
      setPendingRemove(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {projectMembers.map((member) => (
          <li key={member.user_id} className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm">{member.profile.name}</span>
              <span className="label opacity-50">{member.profile.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={member.role === 'leader' ? 'accent' : 'outline'}>
                {ROLE_LABEL[member.role]}
              </Badge>
              {canManage && member.role !== 'leader' && (
                <Button variant="secondary" onClick={() => setPendingRemove(member)}>
                  Quitar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && availableToAdd.length > 0 && (
        <div className="flex items-end gap-2 pt-4 border-t-2 border-ink">
          <Select
            label="Agregar miembro"
            placeholder="Selecciona"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            options={availableToAdd.map((m) => ({ value: m.user_id, label: m.profile.name }))}
          />
          <Select
            label="Rol"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
            options={[
              { value: 'member', label: 'Miembro' },
              { value: 'observer', label: 'Observador' },
            ]}
          />
          <Button variant="accent" onClick={handleAdd} disabled={!selectedUserId || adding}>
            {adding ? 'Agregando...' : 'Agregar'}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={handleRemove}
        title="Quitar miembro del proyecto"
        description={pendingRemove ? `${pendingRemove.profile.name} perderá acceso a este proyecto.` : undefined}
        confirmLabel="Quitar"
        destructive
      />
    </div>
  )
}