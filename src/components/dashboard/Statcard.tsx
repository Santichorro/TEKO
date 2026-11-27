interface StatcardProps {
  label: string
  value: number
  /** Resalta en violeta cuando hay algo que atender (> 0) */
  alert?: boolean
  hint?: string
}

export function Statcard({ label, value, alert = false, hint }: StatcardProps) {
  const highlighted = alert && value > 0
  return (
    <div
      className={`border-2 border-ink p-4 flex flex-col gap-1 ${
        highlighted ? 'bg-accent text-surface border-accent shadow-hard' : 'bg-surface shadow-hard'
      }`}
    >
      <span className="font-display text-4xl leading-none">{value}</span>
      <span className="label">{label}</span>
      {hint && <span className={`label ${highlighted ? 'opacity-80' : 'opacity-50'}`}>{hint}</span>}
    </div>
  )
}
