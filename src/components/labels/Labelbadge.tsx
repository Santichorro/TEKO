import { Badge } from '../ui/Badge'
import type { LabelColor } from '../../types/label'

const VARIANT: Record<LabelColor, 'solid' | 'outline' | 'accent'> = {
  ink: 'solid',
  surface: 'outline',
  accent: 'accent',
}

export function Labelbadge({ name, color }: { name: string; color: LabelColor }) {
  return <Badge variant={VARIANT[color] ?? 'outline'}>{name}</Badge>
}
