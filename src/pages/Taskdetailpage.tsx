import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/Confirmdialog'
import { EmptyState } from '../components/ui/Emptystate'
import { Taskform } from '../components/tasks/Taskform'
import { Tasklabels } from '../components/tasks/Tasklabels'
import { Subtasklist } from '../components/tasks/Subtasklist'
import { useAuth } from '../context/Authcontext'
import { useTeams } from '../context/Teamscontext'
import { formatDate, isOverdue } from '../lib/dates'
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from '../lib/labels'
import { fetchProjectDetail, fetchProjectMembers } from '../lib/queries/projects'
import { deleteTask, fetchTask, updateTask, type TaskInput } from '../lib/queries/tasks'
import { canEditTask, hasPermission } from '../lib/Teampermissions'

export function Taskdetailpage() {
  const { id: projectId, taskId } = useParams<{ id: string; taskId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentTeam } = useTeams()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId,
  })

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

  const updateMutation = useMutation({
    mutationFn: (values: TaskInput) => updateTask(taskId!, taskQuery.data!.status, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      navigate(`/proyectos/${projectId}`)
    },
  })

  if (!currentTeam || !projectId || !taskId) return null

  if (taskQuery.isLoading || projectQuery.isLoading) {
    return <p className="label opacity-60">Cargando tarea…</p>
  }

  const task = taskQuery.data
  const project = projectQuery.data

  // La tarea debe pertenecer al proyecto de la URL, y el proyecto al equipo actual
  if (!task || !project || task.project_id !== projectId) {
    return (
      <EmptyState
        title="Tarea no encontrada"
        description={taskQuery.error?.message ?? 'Esta tarea no existe o no pertenece a este proyecto.'}
        action={
          <Link to={`/proyectos/${projectId}`}>
            <Button variant="secondary">Volver al proyecto</Button>
          </Link>
        }
      />
    )
  }

  const canEdit = canEditTask(currentTeam.role, user?.id, task)
  const canDelete = hasPermission(currentTeam.role, 'delete_tasks')
  const overdue = task.status !== 'completed' && isOverdue(task.due_date)

  return (
    <div className="max-w-3xl">
      <Link to={`/proyectos/${projectId}`} className="label opacity-60 hover:opacity-100">
        ← {project.name}
      </Link>

      {editing ? (
        <>
          <h1 className="font-display text-3xl mt-3 mb-8">Editar tarea</h1>
          <Card>
            <Taskform
              initialValues={{
                title: task.title,
                description: task.description ?? '',
                status: task.status,
                priority: task.priority,
                assigned_to: task.assigned_to,
                start_date: task.start_date,
                due_date: task.due_date,
              }}
              members={membersQuery.data ?? []}
              canAssign={hasPermission(currentTeam.role, 'assign_tasks')}
              submitLabel="Guardar cambios"
              submitting={updateMutation.isPending}
              serverError={updateMutation.error?.message}
              onSubmit={(values) => updateMutation.mutate(values)}
              onCancel={() => {
                updateMutation.reset()
                setEditing(false)
              }}
            />
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-8">
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-3xl">{task.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="solid">{TASK_STATUS_LABEL[task.status]}</Badge>
                <Badge variant={task.priority === 'urgent' || task.priority === 'high' ? 'accent' : 'outline'}>
                  {TASK_PRIORITY_LABEL[task.priority]}
                </Badge>
                {overdue && <Badge variant="accent">Atrasada</Badge>}
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="flex gap-3 shrink-0">
                {canEdit && (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button variant="primary" onClick={() => setConfirmDelete(true)} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {deleteMutation.error && (
            <p role="alert" className="label text-accent mb-4">
              {deleteMutation.error.message}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <h2 className="label opacity-60 mb-4">Descripción</h2>
                {task.description ? (
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-sm opacity-50">Sin descripción.</p>
                )}
              </Card>

              {/* Las subtareas no tienen subtareas propias (un solo nivel) */}
              {!task.parent_task_id && (
                <Card>
                  <h2 className="label opacity-60 mb-4">Subtareas</h2>
                  <Subtasklist parent={task} role={currentTeam.role} userId={user?.id} />
                </Card>
              )}
            </div>

            <Card>
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="label opacity-60 mb-2">Etiquetas</dt>
                  <dd>
                    <Tasklabels
                      taskId={task.id}
                      projectId={projectId}
                      teamId={currentTeam.id}
                      assigned={task.task_labels.map((tl) => tl.label)}
                      canEdit={canEdit}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="label opacity-60">Responsable</dt>
                  <dd className="mt-1 flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <Avatar name={task.assignee.name} size="sm" />
                        <span className="text-sm">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm opacity-50">Sin asignar</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="label opacity-60">Fecha de inicio</dt>
                  <dd className="mt-1 text-sm">{formatDate(task.start_date)}</dd>
                </div>
                <div>
                  <dt className="label opacity-60">Fecha límite</dt>
                  <dd className={`mt-1 text-sm ${overdue ? 'text-accent font-semibold' : ''}`}>
                    {formatDate(task.due_date)}
                  </dd>
                </div>
                {task.completed_at && (
                  <div>
                    <dt className="label opacity-60">Completada</dt>
                    <dd className="mt-1 text-sm">{formatDate(task.completed_at)}</dd>
                  </div>
                )}
              </dl>
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="¿Eliminar esta tarea?"
        description={`"${task.title}" se eliminará de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
      />
    </div>
  )
}
