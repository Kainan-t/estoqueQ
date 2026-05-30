import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatusAtivo {
  op_id: string
  op_numero: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_label: string
}

interface Props {
  statuses: StatusAtivo[]
}

const SETOR_META: Record<string, { icon: string; label: string }> = {
  quimico: { icon: '🧪', label: 'Químico' },
  maquina: { icon: '⚙️', label: 'Máquina' },
  corte: { icon: '✂️', label: 'Corte' },
}

export function EmProducaoAgora({ statuses }: Props) {
  // Agrupar por OP
  const byOp = new Map<string, { op_id: string; op_numero: string; setores: StatusAtivo[] }>()
  for (const s of statuses) {
    if (!byOp.has(s.op_id)) byOp.set(s.op_id, { op_id: s.op_id, op_numero: s.op_numero, setores: [] })
    byOp.get(s.op_id)!.setores.push(s)
  }
  const ops = [...byOp.values()]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">🏭 Em produção agora</CardTitle>
          <Link href="/em-producao" className="text-xs text-blue-600 hover:underline">
            Ver tudo →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {ops.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum setor em produção no momento.
          </p>
        ) : (
          <div className="space-y-4">
            {ops.map(({ op_id, op_numero, setores }) => (
              <div key={op_id}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{op_numero}</p>
                <div className="space-y-1.5">
                  {(['quimico', 'maquina', 'corte'] as const).map(setor => {
                    const meta = SETOR_META[setor]
                    const s = setores.find(x => x.setor === setor)
                    return (
                      <div key={setor} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-muted-foreground shrink-0">
                          {meta.icon} {meta.label}
                        </span>
                        {s ? (
                          <span className="text-slate-800">{s.item_label}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Aguardando</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
