import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 max-w-sm mx-auto">
      {icon && <div className="mb-4 text-accent">{icon}</div>}
      <h3 className="font-display text-2xl uppercase leading-tight mb-2">{title}</h3>
      {description && <p className="text-sm text-ink/60 mb-6">{description}</p>}
      {action}
    </div>
  )
}