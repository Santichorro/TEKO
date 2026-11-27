/** Paleta cerrada del sistema visual: las etiquetas no introducen colores nuevos */
export type LabelColor = 'ink' | 'surface' | 'accent'

export interface Label {
  id: string
  team_id: string
  name: string
  color: LabelColor
}
