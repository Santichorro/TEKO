import { useQuery } from '@tanstack/react-query'
import { Activityfeed } from './Activityfeed'
import { fetchProjectActivity } from '../../lib/queries/activity'

export function Projectactivity({ projectId }: { projectId: string }) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['activity', 'project', projectId],
    queryFn: () => fetchProjectActivity(projectId),
  })

  if (isLoading) return <p className="label opacity-60">Cargando actividad…</p>
  if (error) return <p className="label text-accent">{error.message}</p>
  return <Activityfeed entries={data} withTask emptyText="Aún no hay actividad en este proyecto." />
}
