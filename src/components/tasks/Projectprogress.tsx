import { useQuery } from '@tanstack/react-query'
import { ProgressBar } from '../ui/Progressbar'
import { fetchProjectTasks } from '../../lib/queries/tasks'

/**
 * Progreso = tareas completadas / tareas totales (sin contar subtareas).
 * Comparte la caché ['tasks', projectId] con Taskslist, así que no hace otra petición.
 */
export function ProjectProgress({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
  })

  if (isLoading) return <span className="label opacity-60">…</span>
  if (tasks.length === 0) return <span className="text-sm opacity-50">Sin tareas</span>

  const done = tasks.filter((t) => t.status === 'completed').length
  const percent = (done / tasks.length) * 100

  return (
    <div className="flex flex-col gap-1">
      <ProgressBar value={percent} label={`${done} de ${tasks.length} tareas`} />
    </div>
  )
}
