import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { PeliculaComSaldo } from '@/types'

interface Props { peliculas: PeliculaComSaldo[] }

export function PeliculaList({ peliculas }: Props) {
  if (peliculas.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma película cadastrada. Adicione via Supabase → tabela peliculas.</p>
  }
  return (
    <ul className="space-y-2">
      {peliculas.map(p => (
        <li key={p.id}>
          <Link href={`/peliculas/${p.id}`}
            className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors">
            <div>
              <p className="font-medium">{p.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.largura} · {p.tonalidade} · {p.espessura} · UVA {p.protecao_uva} / UVB {p.protecao_uvb}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Saldo: <span className={`font-semibold ${p.em_alerta ? 'text-amber-600' : 'text-green-700'}`}>
                  {p.saldo.toFixed(1)} m
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {p.em_alerta && <Badge variant="outline" className="border-amber-400 text-amber-700">⚠️ Alerta</Badge>}
              <span className="text-slate-400">›</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
