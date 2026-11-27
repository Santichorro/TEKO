import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/Confirmdialog'
import { addComment, deleteComment, fetchComments, updateComment } from '../../lib/queries/comments'
import { formatRelative } from '../../lib/dates'
import { hasPermission } from '../../lib/Teampermissions'
import type { TeamRole } from '../../services/Teamservice'
import type { Comment } from '../../types/activity'

interface TaskcommentsProps {
  taskId: string
  role: TeamRole
  userId: string | undefined
}

const textareaClass =
  'w-full font-sans text-sm text-ink bg-surface border-2 border-ink px-3 py-2.5 placeholder:text-ink/40 ' +
  'focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-hard-accent resize-y'

export function Taskcomments({ taskId, role, userId }: TaskcommentsProps) {
  const queryClient = useQueryClient()
  const textareaId = useId()
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null)

  const canComment = hasPermission(role, 'comment')
  const canModerate = role === 'owner' || role === 'admin'

  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => fetchComments(taskId),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
    queryClient.invalidateQueries({ queryKey: ['activity', 'task', taskId] })
  }

  const addMutation = useMutation({
    mutationFn: () => addComment(taskId, userId!, body),
    onSuccess: () => {
      setBody('')
      refresh()
    },
  })
  const editMutation = useMutation({
    mutationFn: () => updateComment(editingId!, editBody),
    onSuccess: () => {
      setEditingId(null)
      refresh()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: refresh,
  })

  // Ctrl/⌘ + Enter envía
  const submitOnShortcut = (e: React.KeyboardEvent, send: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isLoading && <p className="label opacity-60">Cargando comentarios…</p>}
      {error && <p className="label text-accent">{error.message}</p>}
      {!isLoading && comments.length === 0 && (
        <p className="text-sm opacity-50">Nadie ha comentado todavía.</p>
      )}

      {comments.length > 0 && (
        <ol className="flex flex-col gap-4">
          {comments.map((c) => {
            const mine = c.author_id === userId
            const edited = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.author?.name ?? '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="text-sm font-semibold">{c.author?.name ?? 'Alguien'}</strong>
                    <time className="label opacity-50" dateTime={c.created_at}>
                      {formatRelative(c.created_at)}
                      {edited && ' · editado'}
                    </time>
                  </p>

                  {editingId === c.id ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        aria-label="Editar comentario"
                        rows={3}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        onKeyDown={(e) => submitOnShortcut(e, () => editMutation.mutate())}
                        className={textareaClass}
                        autoFocus
                      />
                      {editMutation.error && <p className="label text-accent">{editMutation.error.message}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" variant="accent" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
                  )}

                  {editingId !== c.id && (mine || canModerate) && (
                    <div className="flex gap-3 mt-1">
                      {mine && (
                        <button
                          type="button"
                          className="label opacity-50 hover:opacity-100 underline"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditBody(c.body)
                          }}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        className="label opacity-50 hover:opacity-100 underline"
                        onClick={() => setPendingDelete(c)}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {deleteMutation.error && <p className="label text-accent">{deleteMutation.error.message}</p>}

      {canComment ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
          className="flex flex-col gap-2 border-t-2 border-ink/10 pt-4"
        >
          <label htmlFor={textareaId} className="label">
            Nuevo comentario
          </label>
          <textarea
            id={textareaId}
            rows={3}
            placeholder="Escribe una actualización, pregunta o decisión… (Ctrl + Enter para enviar)"
            value={body}
            maxLength={5000}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => submitOnShortcut(e, () => body.trim() && addMutation.mutate())}
            className={textareaClass}
          />
          {addMutation.error && <p className="label text-accent">{addMutation.error.message}</p>}
          <div>
            <Button type="submit" variant="accent" size="sm" disabled={!body.trim() || addMutation.isPending}>
              {addMutation.isPending ? 'Enviando…' : 'Comentar'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="label opacity-50">Los observadores pueden leer, pero no comentar.</p>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        title="¿Eliminar comentario?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
      />
    </div>
  )
}
