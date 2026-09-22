import type { HTMLAttributes } from 'react'

type Variant = 'solid' | 'outline' | 'accent'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  solid: 'bg-ink text-surface border-ink',
  outline: 'bg-transparent text-ink border-ink',
  accent: 'bg-accent text-surface border-accent',
}

export function Badge({ variant = 'outline', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`label inline-flex items-center border-2 px-2 py-0.5 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}