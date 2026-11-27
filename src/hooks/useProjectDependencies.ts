import { useQuery } from '@tanstack/react-query'
import { fetchProjectDependencies } from '../lib/queries/dependencies'

export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: () => fetchProjectDependencies(projectId),
  })
}
