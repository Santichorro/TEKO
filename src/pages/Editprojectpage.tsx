import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTeams } from '../context/Teamscontext'
import { fetchProjectDetail, updateProject } from '../lib/queries/projects'
import { hasPermission } from '../lib/Teampermissions'
import type { ProjectWithLeader } from '../types/project'

export function Editprojectpage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTeam } = useTeams()

  const [project, setProject] = useState<ProjectWithLeader | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!currentTeam || !id) return
    setLoading(true)
    fetchProjectDetail(currentTeam.id, id)
      .then((p) => {
        setProject(p)
        if (p) {
          setName(p.name)
          setDescription(p.description ?? '')
          setStartDate(p.start_date ?? '')
          setDueDate(p.due_date ?? '')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el proyecto.'))
      .finally(() => setLoading(false))
  }, [currentTeam, id])

  if (!currentTeam || !id) return null

  if (loading) {
    return (
      <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
        <p className="label opacity-60">Cargando proyecto...</p>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
        <p className="label opacity-60">Proyecto no encontrado.</p>
      </main>
    )
  }

  if (!hasPermission(currentTeam.role, 'manage_projects')) {
    return (
      <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
        <p className="label opacity-60">No tienes permiso para editar este proyecto.</p>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateProject(id!, {
        name,
        description,
        start_date: startDate || null,
        due_date: dueDate || null,
      })
      navigate(`/proyectos/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el proyecto.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
      <h1 className="font-display text-3xl mb-1">Editar proyecto</h1>
      <p className="label opacity-60 mb-10">{currentTeam.name}</p>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Nombre del proyecto"
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

          {error && <p className="label text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/proyectos/${id}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}