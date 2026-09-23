import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTeams } from '../context/Teamscontext'
import { getTeamMembers } from '../services/Teamservice'
import type { TeamMemberWithProfile } from '../services/Teamservice'
import { createProject } from '../lib/queries/projects'

export function Createprojectpage() {
  const navigate = useNavigate()
  const { currentTeam } = useTeams()

  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [leaderId, setLeaderId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTeam) return
    setMembersLoading(true)
    getTeamMembers(currentTeam.id)
      .then(setMembers)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los miembros.'))
      .finally(() => setMembersLoading(false))
  }, [currentTeam])

  if (!currentTeam) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leaderId) {
      setError('Selecciona un líder para el proyecto.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject({
        team_id: currentTeam!.id,
        name,
        description,
        start_date: startDate || null,
        due_date: dueDate || null,
        leader_id: leaderId,
      })
      navigate(`/proyectos/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el proyecto.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
      <h1 className="font-display text-3xl mb-1">Crear proyecto</h1>
      <p className="label opacity-60 mb-10">{currentTeam.name}</p>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nombre del proyecto"
            placeholder="Ej. Rediseño landing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Descripción"
            placeholder="Opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Fecha de inicio"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="Fecha límite"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Select
            label="Líder del proyecto"
            placeholder={membersLoading ? 'Cargando miembros...' : 'Selecciona un líder'}
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            disabled={membersLoading}
            options={members.map((m) => ({ value: m.user_id, label: m.profile.name }))}
          />

          {error && <p className="label text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear proyecto'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/proyectos')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}