import { forwardRef, useId, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, options, placeholder, id, className = '', disabled, ...props },
    ref,
  ) => {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const hintId = hint ? `${selectId}-hint` : undefined
    const errorId = error ? `${selectId}-error` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="label text-ink">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            defaultValue={props.defaultValue ?? (placeholder ? '' : undefined)}
            className={`
              w-full appearance-none
              font-sans text-sm text-ink bg-surface
              border-2 border-ink pl-3 pr-10 py-2.5
              disabled:opacity-40 disabled:pointer-events-none
              focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-hard-accent
              ${error ? 'border-accent' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Flecha custom — el navegador oculta la nativa por el appearance-none de arriba */}
          <svg
            aria-hidden="true"
            viewBox="0 0 12 8"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-2 w-3 fill-none stroke-ink stroke-2"
          >
            <path d="M1 1.5 6 6.5 11 1.5" />
          </svg>
        </div>

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

Select.displayName = 'Select'