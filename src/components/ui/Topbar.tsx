import type { ReactNode } from 'react'

interface TopbarStat {
  label: string
  value: string | number
}

interface TopbarProps {
  title?: string
  stats?: TopbarStat[]
  actions?: ReactNode
}

export function Topbar({ title, stats, actions }: TopbarProps) {
  return (
    <header className="bg-surface">
      <div className="flex items-center justify-between px-6 py-4">
        {title && <h1 className="font-display text-xl uppercase">{title}</h1>}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div
          className="grid border-t-2 border-ink"
          style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className={`px-6 py-4 ${i > 0 ? 'border-l-2 border-ink' : ''}`}>
              <p className="font-display text-2xl sm:text-3xl leading-none">{stat.value}</p>
              <p className="label text-ink/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}