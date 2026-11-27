import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Taskform } from '../components/tasks/Taskform'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'
import { fetchProjectDetail, fetchProjectMembers } from '../lib/queries/projects'
import { createTask, type TaskInput } from '../lib/queries/tasks'
import { hasPermission } from '../lib/Teampermissions'

export function Createtaskpage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentTeam } = useTeams()

  const projectQuery = useQuery({
    queryKey: ['project', currentTeam?.id, projectId],
    queryFn: () => fetchProjectDetail(currentTeam!.id, projectId!),
    enabled: !!currentTeam && !!projectId,
  })

  const membersQuery = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId!),
    enabled: !!projectId,
  })

  const mutation = useMutation({
    mutationFn: (values: TaskInput) => createTask(projectId!, user!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      navigate(`/proyectos/${projectId}`)
    },
  })

  if (!currentTeam || !projectId) return null

  if (projectQuery.isLoading || membersQuery.isLoading) {
    return <p className="label opacity-60">Cargando…</p>
  }

  const project = projectQuery.data
  if (!project) {
    return <p className="label opacity-60">Proyecto no encontrado.</p>
  }

  if (!hasPermission(currentTeam.role, 'manage_tasks')) {
    return <p className="label opacity-60">No tienes permiso para crear tareas en este proyecto.</p>
  }

  return (
    <div>
      <Link to={`/proyectos/${projectId}`} className="label opacity-60 hover:opacity-100">
        ← {project.name}
      </Link>
      <h1 className="font-display text-3xl mt-3 mb-8">Nueva tarea</h1>

      <Card className="max-w-2xl">
        <Taskform
          members={membersQuery.data ?? []}
          canAssign={hasPermission(currentTeam.role, 'assign_tasks')}
          submitLabel="Crear tarea"
          submitting={mutation.isPending}
          serverError={mutation.error?.message}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => navigate(`/proyectos/${projectId}`)}
        />
      </Card>
    </div>
  )
}
