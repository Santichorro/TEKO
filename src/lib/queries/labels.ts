import { supabase } from '../supabase'
import type { Label, LabelColor } from '../../types/label'

export async function fetchTeamLabels(teamId: string): Promise<Label[]> {
  const { data, error } = await supabase
    .from('labels')
    .select('id, team_id, name, color')
    .eq('team_id', teamId)
    .order('name', { ascending: true })

  if (error) throw new Error(`No se pudieron cargar las etiquetas: ${error.message}`)
  return (data ?? []) as Label[]
}

export async function createLabel(teamId: string, name: string, color: LabelColor): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('El nombre de la etiqueta no puede estar vacío.')
  if (trimmed.length > 40) throw new Error('Máximo 40 caracteres.')

  const { error } = await supabase.from('labels').insert({ team_id: teamId, name: trimmed, color })
  if (error) {
    // 23505 = unique (team_id, name)
    throw new Error(error.code === '23505' ? 'Ya existe una etiqueta con ese nombre.' : `No se pudo crear la etiqueta: ${error.message}`)
  }
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', labelId)
  if (error) throw new Error(`No se pudo eliminar la etiqueta: ${error.message}`)
}

export async function addTaskLabel(taskId: string, labelId: string): Promise<void> {
  const { error } = await supabase.from('task_labels').insert({ task_id: taskId, label_id: labelId })
  if (error && error.code !== '23505') throw new Error(`No se pudo asignar la etiqueta: ${error.message}`)
}

export async function removeTaskLabel(taskId: string, labelId: string): Promise<void> {
  const { error } = await supabase.from('task_labels').delete().eq('task_id', taskId).eq('label_id', labelId)
  if (error) throw new Error(`No se pudo quitar la etiqueta: ${error.message}`)
}
