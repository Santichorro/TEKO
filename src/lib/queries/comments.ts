import { supabase } from '../supabase'
import type { Comment } from '../../types/activity'

const FIELDS = 'id, task_id, author_id, body, created_at, updated_at, author:profiles!comments_author_id_fkey ( id, name, avatar_url )'

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(FIELDS)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar los comentarios: ${error.message}`)
  return (data ?? []) as unknown as Comment[]
}

function validate(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('El comentario no puede estar vacío.')
  if (trimmed.length > 5000) throw new Error('Máximo 5000 caracteres.')
  return trimmed
}

export async function addComment(taskId: string, authorId: string, body: string): Promise<void> {
  const { error } = await supabase.from('comments').insert({ task_id: taskId, author_id: authorId, body: validate(body) })
  if (error) {
    throw new Error(error.code === '42501' ? 'No tienes permiso para comentar.' : `No se pudo comentar: ${error.message}`)
  }
}

export async function updateComment(commentId: string, body: string): Promise<void> {
  const { error } = await supabase.from('comments').update({ body: validate(body) }).eq('id', commentId)
  if (error) throw new Error(`No se pudo editar el comentario: ${error.message}`)
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error(`No se pudo eliminar el comentario: ${error.message}`)
}
