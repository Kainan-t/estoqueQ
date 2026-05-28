import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import type { OrdemProducaoComItens } from '@/types'

interface Props {
  ordens: OrdemProducaoComItens[]
}

export function OPList({ ordens }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/ordens-producao/nova">
          <Button>+ Nova OP</Button>
        </Link>
      </div>

      {ordens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma ordem de produção cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {ordens.map((ordem) => (
            <li key={ordem.id}>
              <Link
                href={`/ordens-producao/${ordem.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{ordem.numero}</p>
                    <StatusBadge status={ordem.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ordem.itens.length} item(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criado em: {new Date(ordem.created_at).toLocaleDateString('pt-BR')}
                    {ordem.status === 'emitida' && ordem.emitida_at && (
                      <span> · Emitida em: {new Date(ordem.emitida_at).toLocaleDateString('pt-BR')}</span>
                    )}
                  </p>
                </div>
                <span className="text-slate-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
