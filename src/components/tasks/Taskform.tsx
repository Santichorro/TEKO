import { useId, useState } from 'react'
import { z } from 'zod'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
} from '../../lib/labels'
import type { TaskInput } from '../../lib/queries/tasks'
import type { ProjectMemberWithProfile } from '../../types/project'

const taskSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio').max(200, 'Máximo 200 caracteres'),
    description: z.string().max(5000, 'Máximo 5000 caracteres'),
    start_date: z.string(),
    due_date: z.string(),
  })
  .refine((v) => !v.start_date || !v.due_date || v.start_date <= v.due_date, {
    path: ['due_date'],
    message: 'La fecha límite no puede ser anterior al inicio',
  })

const EMPTY_TASK: TaskInput = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigned_to: null,
  start_date: null,
  due_date: null,
}

interface TaskformProps {
  initialValues?: TaskInput
  members: ProjectMemberWithProfile[]
  /** Miembros sin permiso de asignar no pueden cambiar el responsable */
  canAssign: boolean
  submitLabel: string
  submitting: boolean
  serverError?: string | null
  onSubmit: (values: TaskInput) => void
  onCancel: () => void
}

export function Taskform({
  initialValues = EMPTY_TASK,
  members,
  canAssign,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: TaskformProps) {
  const [values, setValues] = useState<TaskInput>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const descriptionId = useId()

  function set<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = taskSchema.safeParse({
      title: values.title,
      description: values.description,
      start_date: values.start_date ?? '',
      due_date: values.due_date ?? '',
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label="Título"
        placeholder="Ej. Diseñar página de inicio"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={descriptionId} className="label text-ink">
          Descripción
        </label>
        <textarea
          id={descriptionId}
          rows={4}
          placeholder="Opcional"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          className="font-sans text-sm text-ink bg-surface border-2 border-ink px-3 py-2.5 placeholder:text-ink/40 focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-hard-accent resize-y"
        />
        {errors.description && <p className="label text-accent">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Estado"
          value={values.status}
          onChange={(e) => set('status', e.target.value as TaskInput['status'])}
          options={TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))}
        />
        <Select
          label="Prioridad"
          value={values.priority}
          onChange={(e) => set('priority', e.target.value as TaskInput['priority'])}
          options={TASK_PRIORITY_ORDER.map((p) => ({ value: p, label: TASK_PRIORITY_LABEL[p] }))}
        />
      </div>

      <Select
        label="Responsable"
        value={values.assigned_to ?? ''}
        onChange={(e) => set('assigned_to', e.target.value || null)}
        disabled={!canAssign}
        hint={canAssign ? undefined : 'Solo líderes y administradores pueden asignar'}
        options={[
          { value: '', label: 'Sin asignar' },
          ...members.map((m) => ({ value: m.user_id, label: m.profile.name })),
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          type="date"
          label="Fecha de inicio"
          value={values.start_date ?? ''}
          onChange={(e) => set('start_date', e.target.value || null)}
        />
        <Input
          type="date"
          label="Fecha límite"
          value={values.due_date ?? ''}
          onChange={(e) => set('due_date', e.target.value || null)}
          error={errors.due_date}
        />
      </div>

      {serverError && (
        <p role="alert" className="label text-accent">
          {serverError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="accent" disabled={submitting}>
          {submitting ? 'Guardando…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
