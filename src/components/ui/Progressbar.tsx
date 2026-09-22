interface ProgressBarProps {
  value: number // 0-100
  segments?: number
  label?: string
}

export function ProgressBar({ value, segments = 10, label }: ProgressBarProps) {
  const filled = Math.round((value / 100) * segments)

  return (
    <div>
      {label && (
        <div className="flex justify-between mb-1.5">
          <span className="label text-ink/60">{label}</span>
          <span className="label text-ink">{Math.round(value)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex gap-1"
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 border-2 border-ink ${i < filled ? 'bg-accent' : 'bg-surface'}`}
          />
        ))}
      </div>
    </div>
  )
}