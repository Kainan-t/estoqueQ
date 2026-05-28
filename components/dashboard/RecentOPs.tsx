import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OP {
  id: string
  numero: string
  status: 'rascunho' | 'emitida' | 'cancelada'
  created_at: string
  emitida_at: string | null
  observacao: string | null
}

function StatusBadge({ status }: { status: OP['status'] }) {
  if (status === 'rascunho')
    return (
      <Badge variant="outline" className="text-xs shrink-0">
        Rascunho
      </Badge>
    )
  if (status === 'emitida')
    return (
      <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs shrink-0 hover:bg-blue-100">
        Emitida
      </Badge>
    )
  if (status === 'cancelada')
    return (
      <Badge variant="destructive" className="text-xs shrink-0">
        Cancelada
      </Badge>
    )
  return null
}

export function RecentOPs({ ops }: { ops: OP[] }) {
  const activeOps = ops.filter(op => op.status !== 'cancelada')
  const hasActive = activeOps.length > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">📋 Ordens de Produção</CardTitle>
          <Link
            href="/ordens-producao"
            className="text-xs text-blue-600 hover:underline"
          >
            Ver todas →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {ops.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">Nenhuma OP criada ainda.</p>
            <Link
              href="/ordens-producao/nova"
              className="text-sm text-blue-600 hover:underline inline-block"
            >
              + Criar primeira OP
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {ops.map(op => (
              <li key={op.id}>
                <Link
                  href={`/ordens-producao/${op.id}`}
                  className="py-2.5 flex items-center justify-between hover:bg-muted/30 -mx-2 px-2 rounded transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold tabular-nums shrink-0">{op.numero}</span>
                    {op.observacao && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:block">
                        {op.observacao}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(op.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    <StatusBadge status={op.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!hasActive && ops.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Link
              href="/ordens-producao/nova"
              className="text-xs text-blue-600 hover:underline"
            >
              + Nova Ordem de Produção
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
