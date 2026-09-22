import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, id, className = '', disabled, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label text-ink">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`
            font-sans text-sm text-ink bg-surface
            border-2 border-ink px-3 py-2.5
            placeholder:text-ink/40
            disabled:opacity-40 disabled:pointer-events-none
            focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-hard-accent
            ${error ? 'border-accent' : ''}
            ${className}
          `}
          {...props}
        />

        {hint && !error && (
          <p id={hintId} className="label text-ink/50">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="label text-accent">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'