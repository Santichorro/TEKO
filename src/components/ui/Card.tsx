import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

const paddings: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
}

export function Card({ padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border-2 border-ink shadow-hard ${paddings[padding]} ${className}`}
      {...props}
    />
  )
}