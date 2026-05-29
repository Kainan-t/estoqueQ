import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { RegistroCorte } from '@/types'

interface Props { cortes: RegistroCorte[] }

export function CorteList({ cortes }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Corte</h1>
        <Link href="/corte/novo">
          <Button>✂️ Registrar Corte</Button>
        </Link>
      </div>

      {cortes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum corte registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {cortes.map(c => (
            <li key={c.id}>
              <Link href={`/corte/${c.id}`}
                className="flex items-start justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors">
                <div>
                  <p className="font-medium">{c.produtos_finalizados?.nome ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    OP: <span className="font-medium">{c.ordens_producao?.numero ?? '—'}</span>
                    {c.metros_cortados != null && ` · ${c.metros_cortados} m cortados`}
                    {' · '}{new Date(c.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  <span className="text-green-700">🟢 {c.cx_verdes}</span>
                  <span className="text-amber-600">🟡 {c.cx_amarelas}</span>
                  <span className="text-red-600">🔴 {c.cx_vermelhas}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
