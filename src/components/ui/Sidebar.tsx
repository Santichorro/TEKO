import type { ReactNode } from 'react'

interface SidebarItem {
  label: string
  icon?: ReactNode
  active?: boolean
  onClick?: () => void
}

interface SidebarProps {
  items: SidebarItem[]
  header?: ReactNode
}

export function Sidebar({ items, header }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full w-60 bg-ink text-surface">
      {header && <div className="px-4 py-5 border-b-2 border-surface/20">{header}</div>}
      <nav className="flex-1 flex flex-col gap-1 p-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 font-display text-sm uppercase text-left focus-visible:outline-none focus-visible:shadow-hard-accent ${
              item.active
                ? 'bg-accent text-surface'
                : 'text-surface/70 hover:bg-surface/10 hover:text-surface'
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}