import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ProgressBar } from '../ui/Progressbar'
import { createSubtask, deleteTask, fetchSubtasks, setTaskCompleted } from '../../lib/queries/tasks'
import { canEditTask, hasPermission } from '../../lib/Teampermissions'
import type { TeamRole } from '../../services/Teamservice'

interface SubtasklistProps {
  parent: { id: string; project_id: string }
  role: TeamRole
  userId: string | undefined
}

export function Subtasklist({ parent, role, userId }: SubtasklistProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')

  const canCreate = hasPermission(role, 'manage_tasks')
  const canDelete = hasPermission(role, 'delete_tasks')

  const { data: subtasks = [], isLoading, error } = useQuery({
    queryKey: ['subtasks', parent.id],
    queryFn: () => fetchSubtasks(parent.id),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subtasks', parent.id] })
    queryClient.invalidateQueries({ queryKey: ['task', parent.id] })
    queryClient.invalidateQueries({ queryKey: ['tasks', parent.project_id] })
  }

  const createMutation = useMutation({
    mutationFn: () => createSubtask(parent, userId!, title),
    onSuccess: () => {
      setTitle('')
      refresh()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setTaskCompleted(id, completed),
    onSuccess: refresh,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: refresh,
  })

  const done = subtasks.filter((s) => s.status === 'completed').length
  const mutationError = toggleMutation.error ?? deleteMutation.error

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="label opacity-60">Cargando subtareas…</p>}
      {error && <p className="label text-accent">{error.message}</p>}

      {subtasks.length > 0 && (
        <>
          <ProgressBar value={(done / subtasks.length) * 100} label={`${done} de ${subtasks.length}`} />
          <ul className="flex flex-col divide-y-2 divide-ink/10">
            {subtasks.map((sub) => {
              const completed = sub.status === 'completed'
              const editable = canEditTask(role, userId, sub)
              return (
                <li key={sub.id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={completed}
                    disabled={!editable || toggleMutation.isPending}
                    onChange={() => toggleMutation.mutate({ id: sub.id, completed: !completed })}
                    aria-label={`Marcar "${sub.title}" como ${completed ? 'pendiente' : 'completada'}`}
                    className="h-4 w-4 shrink-0 accent-accent cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className={`flex-1 min-w-0 text-sm truncate ${completed ? 'line-through opacity-50' : ''}`}>
                    {sub.title}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(sub.id)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Eliminar subtarea "${sub.title}"`}
                      className="label px-1 opacity-40 hover:opacity-100 focus-visible:outline-none focus-visible:shadow-hard-accent"
                    >
                      ✕
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {!isLoading && subtasks.length === 0 && <p className="text-sm opacity-50">Sin subtareas.</p>}

      {mutationError && <p className="label text-accent">{mutationError.message}</p>}

      {canCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1 min-w-0">
            <Input
              label="Nueva subtarea"
              placeholder="Ej. Revisar textos"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              error={createMutation.error?.message}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={createMutation.isPending || !title.trim()}>
            Agregar
          </Button>
        </form>
      )}
    </div>
  )
}
