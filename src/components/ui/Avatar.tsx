import type { HTMLAttributes } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  src?: string
  size?: Size
}

const sizes: Record<Size, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)
  return initials.toUpperCase()
}

export function Avatar({ name, src, size = 'md', className = '', ...props }: AvatarProps) {
  return (
    <div
      className={`
        inline-flex items-center justify-center shrink-0
        border-2 border-ink bg-accent text-surface font-display overflow-hidden
        ${sizes[size]} ${className}
      `}
      title={name}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  )
}