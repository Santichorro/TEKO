import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Escucha cambios en las tareas de un proyecto (otra persona crea, mueve o
 * borra) y refresca la caché. Realtime aplica RLS: solo llegan las filas visibles.
 */
export function useProjectTasksRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      // Agrupa ráfagas de eventos (p. ej. mover varias tareas seguidas)
      clearTimeout(timer)
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
        queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] })
      }, 150)
    }

    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        refresh
      )
      // Dependencias: no se pueden filtrar por proyecto; RLS limita lo que llega
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_dependencies' }, refresh)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `project_id=eq.${projectId}` },
        () => queryClient.invalidateQueries({ queryKey: ['activity', 'project', projectId] })
      )
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}
