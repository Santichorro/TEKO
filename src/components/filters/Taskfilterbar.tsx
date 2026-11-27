import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { countActiveFilters, type TaskFilters } from '../../lib/taskFilters'
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
} from '../../lib/labels'

interface Option {
  id: string
  name: string
}

interface TaskfilterbarProps {
  filters: TaskFilters
  onChange: (patch: Partial<TaskFilters>) => void
  onClear: () => void
  members: Option[]
  labels: Option[]
  /** Solo en la vista de todo el equipo */
  projects?: Option[]
  resultCount?: number
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="label flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent cursor-pointer"
      />
      {label}
    </label>
  )
}

export function Taskfilterbar({ filters, onChange, onClear, members, labels, projects, resultCount }: TaskfilterbarProps) {
  const active = countActiveFilters(filters)

  return (
    <div role="search" aria-label="Filtrar tareas" className="flex flex-col gap-4 border-2 border-ink bg-surface p-4 shadow-hard-sm">
      <Input
        label="Buscar"
        type="search"
        placeholder="Título o descripción…"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Select
          label="Responsable"
          value={filters.assignee}
          onChange={(e) => onChange({ assignee: e.target.value })}
          options={[
            { value: '', label: 'Todos' },
            { value: 'me', label: 'Mis tareas' },
            { value: 'none', label: 'Sin asignar' },
            ...members.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Select
          label="Estado"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as TaskFilters['status'] })}
          options={[{ value: '', label: 'Todos' }, ...TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))]}
        />
        <Select
          label="Prioridad"
          value={filters.priority}
          onChange={(e) => onChange({ priority: e.target.value as TaskFilters['priority'] })}
          options={[{ value: '', label: 'Todas' }, ...TASK_PRIORITY_ORDER.map((p) => ({ value: p, label: TASK_PRIORITY_LABEL[p] }))]}
        />
        <Select
          label="Etiqueta"
          value={filters.label}
          onChange={(e) => onChange({ label: e.target.value })}
          options={[{ value: '', label: 'Todas' }, ...labels.map((l) => ({ value: l.id, label: l.name }))]}
        />
        {projects && (
          <Select
            label="Proyecto"
            value={filters.project}
            onChange={(e) => onChange({ project: e.target.value })}
            options={[{ value: '', label: 'Todos' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
        )}
        <Select
          label="Fecha límite"
          value={filters.due}
          onChange={(e) => onChange({ due: e.target.value as TaskFilters['due'] })}
          options={[
            { value: '', label: 'Cualquiera' },
            { value: 'overdue', label: 'Atrasadas' },
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Próximos 7 días' },
            { value: 'month', label: 'Próximos 30 días' },
            { value: 'nodate', label: 'Sin fecha' },
          ]}
        />
        <Select
          label="Ordenar por"
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as TaskFilters['sort'] })}
          options={[
            { value: 'due', label: 'Vencimiento' },
            { value: 'priority', label: 'Prioridad' },
            { value: 'updated', label: 'Última actualización' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Checkbox label="Solo bloqueadas" checked={filters.blocked} onChange={(v) => onChange({ blocked: v })} />
        <Checkbox label="Mostrar completadas" checked={filters.showCompleted} onChange={(v) => onChange({ showCompleted: v })} />
        <span className="flex-1" />
        {resultCount !== undefined && (
          <span className="label opacity-60" aria-live="polite">
            {resultCount} {resultCount === 1 ? 'tarea' : 'tareas'}
          </span>
        )}
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar filtros ({active})
          </Button>
        )}
      </div>
    </div>
  )
}
