import type { ReactNode } from 'react'

type ToastVariant = 'default' | 'accent'

interface ToastProps {
  message: string
  description?: string
  variant?: ToastVariant
  onClose?: () => void
  icon?: ReactNode
}

export function Toast({ message, description, variant = 'default', onClose, icon }: ToastProps) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 border-2 bg-surface shadow-hard px-4 py-3 max-w-sm ${
        variant === 'accent' ? 'border-accent' : 'border-ink'
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="font-display text-sm uppercase">{message}</p>
        {description && <p className="label text-ink/60 mt-1">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="label shrink-0 hover:text-accent focus-visible:outline-none focus-visible:text-accent"
        >
          ✕
        </button>
      )}
    </div>
  )
}