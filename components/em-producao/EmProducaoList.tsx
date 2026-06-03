import type { OPEmProducao, Cargo, Setor } from '@/types'
import { OPStatusCard } from './OPStatusCard'

interface Props {
  ops: OPEmProducao[]
  meuCargo: Cargo
  meuSetor: Setor | null
}

export function EmProducaoList({ ops, meuCargo, meuSetor }: Props) {
  if (ops.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        Nenhuma OP emitida no momento.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {ops.map(op => (
        <OPStatusCard
          key={op.id}
          op={{ id: op.id, numero: op.numero, emitida_at: op.emitida_at }}
          itens={op.itens}
          statusSetor={op.statusSetor}
          lotes={op.lotes}
          meuCargo={meuCargo}
          meuSetor={meuSetor}
        />
      ))}
    </div>
  )
}
