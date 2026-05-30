import { Badge } from '@/components/ui/badge'
import type { StatusOP } from '@/types'

export function StatusBadge({ status }: { status: StatusOP | string }) {
  if (status === 'rascunho') return <Badge variant="outline">Rascunho</Badge>
  if (status === 'emitida') return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Emitida</Badge>
  if (status === 'concluida') return <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs shrink-0 hover:bg-green-100">Concluída</Badge>
  if (status === 'cancelada') return <Badge variant="destructive">Cancelada</Badge>
  return null
}
