import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-2 font-display uppercase tracking-tight ' +
  'border-2 border-ink transition-[transform,box-shadow] duration-75 ease-out ' +
  'disabled:opacity-40 disabled:pointer-events-none ' +
  // Interacción brutalista: el botón "se hunde" en su propia sombra al presionar
  'active:translate-x-1 active:translate-y-1 active:shadow-none'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-surface shadow-hard hover:bg-ink/90',
  secondary: 'bg-surface text-ink shadow-hard hover:bg-surface/80',
  accent: 'bg-accent text-surface border-accent shadow-hard hover:bg-accent/90',
  ghost: 'bg-transparent text-ink shadow-none hover:bg-ink/5',
}

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-2',
  md: 'text-sm px-5 py-3',
  lg: 'text-base px-7 py-4',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'