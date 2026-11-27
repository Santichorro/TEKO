import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { describeActivity } from '../../lib/activityText'
import { formatRelative } from '../../lib/dates'
import type { ActivityEntry } from '../../types/activity'

interface ActivityfeedProps {
  entries: ActivityEntry[]
  /** Vista de proyecto: muestra el nombre de la tarea y enlaza a ella */
  projectId?: string
  emptyText?: string
}

export function Activityfeed({ entries, projectId, emptyText = 'Sin actividad todavía.' }: ActivityfeedProps) {
  if (entries.length === 0) return <p className="text-sm opacity-50">{emptyText}</p>

  return (
    <ol className="flex flex-col">
      {entries.map((entry) => {
        const who = entry.actor?.name ?? 'Alguien'
        const text = describeActivity(entry, !!projectId)
        return (
          <li key={entry.id} className="flex gap-3 py-2.5 border-b-2 border-ink/10 last:border-b-0">
            <Avatar name={who} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <strong className="font-semibold">{who}</strong> {text}
              </p>
              <p className="label opacity-50 mt-0.5">
                <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString('es-CO')}>
                  {formatRelative(entry.created_at)}
                </time>
                {projectId && entry.task_id && (
                  <>
                    {' · '}
                    <Link to={`/proyectos/${projectId}/tareas/${entry.task_id}`} className="underline">
                      Ver tarea
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
