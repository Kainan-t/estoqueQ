import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MateriaPrimaComSaldo, PeliculaComSaldo } from '@/types'

function StockRow({
  nome,
  saldo,
  unidade,
  estoqueMinimo,
  href,
}: {
  nome: string
  saldo: number
  unidade: string
  estoqueMinimo: number
  href: string
}) {
  // ratio: 1.0 = at minimum, 2.0 = 2x minimum, <1 = below minimum
  const ratio = estoqueMinimo > 0 ? saldo / estoqueMinimo : 2
  // bar fills to 50% at minimum, 100% at 2x minimum
  const pct = Math.min(Math.max(ratio * 50, 0), 100)

  const barColor =
    ratio < 1 ? 'bg-red-500' : ratio < 1.5 ? 'bg-amber-500' : 'bg-green-500'
  const valueColor =
    ratio < 1 ? 'text-red-700 font-semibold' : ratio < 1.5 ? 'text-amber-700' : 'text-slate-700'

  return (
    <Link href={href}>
      <div className="group py-2 px-2 rounded hover:bg-muted/40 transition-colors -mx-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm truncate max-w-[55%] group-hover:text-blue-600 transition-colors">
            {nome}
          </span>
          <span className={`text-xs tabular-nums ${valueColor}`}>
            {saldo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unidade}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
          />
        </div>
        {estoqueMinimo > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            mín: {estoqueMinimo.toLocaleString('pt-BR')} {unidade}
          </p>
        )}
      </div>
    </Link>
  )
}

interface Props {
  materias: MateriaPrimaComSaldo[]
  peliculas: PeliculaComSaldo[]
}

export function StockOverview({ materias, peliculas }: Props) {
  if (materias.length === 0 && peliculas.length === 0) return null

  // Sort: alerts first, then by name
  const sortedMaterias = [...materias].sort((a, b) => {
    if (a.em_alerta !== b.em_alerta) return a.em_alerta ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  const sortedPeliculas = [...peliculas].sort((a, b) => {
    if (a.em_alerta !== b.em_alerta) return a.em_alerta ? -1 : 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {materias.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">🧪 Nível de Estoque — Matérias-Primas</CardTitle>
              <Link href="/materias-primas" className="text-xs text-blue-600 hover:underline">
                Ver todas →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {sortedMaterias.map(m => (
                <StockRow
                  key={m.id}
                  nome={m.nome}
                  saldo={m.saldo}
                  unidade={m.unidade}
                  estoqueMinimo={m.estoque_minimo}
                  href={`/materias-primas/${m.id}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {peliculas.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">🎞️ Nível de Estoque — Películas</CardTitle>
              <Link href="/peliculas" className="text-xs text-blue-600 hover:underline">
                Ver todas →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {sortedPeliculas.map(p => (
                <StockRow
                  key={p.id}
                  nome={p.nome}
                  saldo={p.saldo}
                  unidade="m"
                  estoqueMinimo={p.estoque_minimo}
                  href={`/peliculas/${p.id}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
