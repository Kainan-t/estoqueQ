import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MateriaPrimaComSaldo } from '@/types'

interface Props { materias: MateriaPrimaComSaldo[] }

export function StockAlerts({ materias }: Props) {
  const emAlerta = materias.filter(m => m.em_alerta)
  if (emAlerta.length === 0) return null

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-700">⚠️ Estoque abaixo do mínimo</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {emAlerta.map(m => (
            <li key={m.id} className="text-sm flex justify-between">
              <span className="font-medium text-amber-900">{m.nome}</span>
              <span className="text-amber-700">
                {m.saldo.toFixed(1)} kg (mín: {m.estoque_minimo} kg)
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
