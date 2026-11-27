/**
 * Las columnas `date` de Postgres llegan como 'YYYY-MM-DD'. `new Date('2026-10-05')`
 * las interpreta en UTC y en Colombia (UTC-5) se muestran un día antes.
 * Estas funciones las leen como fecha local.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDate(value: string): Date {
  const match = DATE_ONLY.exec(value)
  if (match) {
    const [, y, m, d] = match
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  return new Date(value)
}

export function formatDate(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback
  return parseDate(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** true si la fecha ya pasó (comparando solo el día, sin hora). */
export function isOverdue(value: string | null | undefined): boolean {
  if (!value) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseDate(value) < today
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 5 minutos", "ayer", "hace 3 días"; más de una semana → fecha corta */
export function formatRelative(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'hace un momento'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 604800) return relative.format(Math.round(seconds / 86400), 'day')
  return formatDate(iso)
}
