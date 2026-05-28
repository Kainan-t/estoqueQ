import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MateriaPrimaComSaldo, PeliculaComSaldo } from '@/types'

interface Props {
  materias: MateriaPrimaComSaldo[]
  peliculas: PeliculaComSaldo[]
}

export function StockAlerts({ materias, peliculas }: Props) {
  const materiasAlerta = materias.filter(m => m.em_alerta)
  const peliculasAlerta = peliculas.filter(p => p.em_alerta)

  if (materiasAlerta.length === 0 && peliculasAlerta.length === 0) return null

  const total = materiasAlerta.length + peliculasAlerta.length

  return (
    <Card className="border-red-200 bg-red-50/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-red-700 flex items-center gap-2">
          <span>🔴</span>
          <span>
            {total} {total === 1 ? 'item abaixo' : 'itens abaixo'} do estoque mínimo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {materiasAlerta.map(m => {
            const deficit = m.estoque_minimo - m.saldo
            return (
              <li key={m.id}>
                <Link
                  href={`/materias-primas/${m.id}`}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span className="font-medium text-red-900">🧪 {m.nome}</span>
                  <span className="text-red-700 tabular-nums text-xs">
                    {m.saldo.toFixed(1)} {m.unidade}{' '}
                    <span className="text-red-400">/</span>{' '}
                    mín {m.estoque_minimo} {m.unidade}
                    {deficit > 0 && (
                      <span className="ml-1 font-semibold">(−{deficit.toFixed(1)} {m.unidade})</span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
          {peliculasAlerta.map(p => {
            const deficit = p.estoque_minimo - p.saldo
            return (
              <li key={p.id}>
                <Link
                  href={`/peliculas/${p.id}`}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span className="font-medium text-red-900">🎞️ {p.nome}</span>
                  <span className="text-red-700 tabular-nums text-xs">
                    {p.saldo.toFixed(1)} m{' '}
                    <span className="text-red-400">/</span>{' '}
                    mín {p.estoque_minimo} m
                    {deficit > 0 && (
                      <span className="ml-1 font-semibold">(−{deficit.toFixed(1)} m)</span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
