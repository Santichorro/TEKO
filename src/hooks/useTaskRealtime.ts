import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/** Comentarios y actividad de una tarea en vivo (lo que escriben otras personas aparece solo). */
export function useTaskRealtime(taskId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!taskId) return
    const channel = supabase
      .channel(`task:${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `task_id=eq.${taskId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['activity', 'task', taskId] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, queryClient])
}
