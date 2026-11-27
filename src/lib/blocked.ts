import type { Dependency } from './queries/dependencies'
import type { TaskStatus } from '../types/task'

/** Ids de tareas abiertas que tienen al menos una dependencia sin completar */
export function computeBlockedIds(tasks: { id: string; status: TaskStatus }[], deps: Dependency[]): Set<string> {
  const status = new Map(tasks.map((t) => [t.id, t.status]))
  const blocked = new Set<string>()
  for (const d of deps) {
    const own = status.get(d.task_id)
    const blocker = status.get(d.depends_on_task_id)
    if (own && own !== 'completed' && blocker && blocker !== 'completed') blocked.add(d.task_id)
  }
  return blocked
}
