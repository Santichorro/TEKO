import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ConfirmDialog } from '../ui/Confirmdialog'
import { Labelbadge } from './Labelbadge'
import { createLabel, deleteLabel, fetchTeamLabels } from '../../lib/queries/labels'
import type { Label, LabelColor } from '../../types/label'

const COLOR_OPTIONS: { value: LabelColor; label: string }[] = [
  { value: 'accent', label: 'Violeta' },
  { value: 'ink', label: 'Oscuro' },
  { value: 'surface', label: 'Claro (borde)' },
]

/** Etiquetas del equipo: todos las ven; Owner/Admin/Líder las crean y eliminan. */
export function Teamlabels({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState<LabelColor>('accent')
  const [pendingDelete, setPendingDelete] = useState<Label | null>(null)

  const { data: labels = [], isLoading, error } = useQuery({
    queryKey: ['labels', teamId],
    queryFn: () => fetchTeamLabels(teamId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['labels', teamId] })
    // Las tareas muestran etiquetas embebidas: refrescarlas también
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['task'] })
  }

  const createMutation = useMutation({
    mutationFn: () => createLabel(teamId, name, color),
    onSuccess: () => {
      setName('')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSuccess: invalidate,
  })

  return (
    <section className="flex flex-col gap-4">
      <h2 className="label opacity-60">Etiquetas</h2>
      <Card padding="sm" className="flex flex-col gap-4">
        {isLoading && <p className="label opacity-60">Cargando etiquetas…</p>}
        {error && <p className="label text-accent">{error.message}</p>}

        {!isLoading && labels.length === 0 && (
          <p className="text-sm opacity-60">
            {canManage ? 'Crea etiquetas para clasificar las tareas del equipo.' : 'El equipo aún no tiene etiquetas.'}
          </p>
        )}

        {labels.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <li key={label.id} className="flex items-center gap-1">
                <Labelbadge name={label.name} color={label.color} />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(label)}
                    aria-label={`Eliminar etiqueta ${label.name}`}
                    className="label px-1 opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:shadow-hard-accent"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end border-t-2 border-ink/10 pt-4"
          >
            <Input
              label="Nueva etiqueta"
              placeholder="Ej. Diseño"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              error={createMutation.error?.message}
            />
            <Select
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value as LabelColor)}
              options={COLOR_OPTIONS}
            />
            <Button type="submit" variant="accent" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </form>
        )}
        {deleteMutation.error && <p className="label text-accent">{deleteMutation.error.message}</p>}
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        title="¿Eliminar etiqueta?"
        description={`"${pendingDelete?.name}" se quitará de todas las tareas que la tengan.`}
        confirmLabel="Eliminar"
        destructive
      />
    </section>
  )
}
