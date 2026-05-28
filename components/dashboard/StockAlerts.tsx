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

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-700">⚠️ Estoque abaixo do mínimo</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {materiasAlerta.map(m => (
            <li key={m.id} className="text-sm flex justify-between">
              <span className="font-medium text-amber-900">{m.nome}</span>
              <span className="text-amber-700">{m.saldo.toFixed(1)} {m.unidade} (mín: {m.estoque_minimo} {m.unidade})</span>
            </li>
          ))}
          {peliculasAlerta.map(p => (
            <li key={p.id} className="text-sm flex justify-between">
              <span className="font-medium text-amber-900">🎞️ {p.nome}</span>
              <span className="text-amber-700">{p.saldo.toFixed(1)} m (mín: {p.estoque_minimo} m)</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
