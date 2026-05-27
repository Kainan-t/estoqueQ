import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { MateriaPrimaComSaldo } from '@/types'

interface Props { materias: MateriaPrimaComSaldo[] }

export function MPList({ materias }: Props) {
  return (
    <ul className="space-y-2">
      {materias.map(mp => (
        <li key={mp.id}>
          <Link href={`/materias-primas/${mp.id}`}
            className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors">
            <div>
              <p className="font-medium">{mp.nome}</p>
              <p className="text-sm text-muted-foreground">
                Saldo:{' '}
                <span className={`font-semibold ${mp.em_alerta ? 'text-amber-600' : 'text-green-700'}`}>
                  {mp.saldo.toFixed(1)} {mp.unidade}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mp.em_alerta && (
                <Badge variant="outline" className="border-amber-400 text-amber-700">
                  ⚠️ Alerta
                </Badge>
              )}
              <span className="text-slate-400">›</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
