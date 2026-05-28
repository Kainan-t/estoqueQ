import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MPMovement {
  id: string
  kind: 'mp'
  tipo: 'entrada' | 'saida'
  nome_material: string
  quantidade: number
  data: string
  created_at: string
  profiles?: { nome: string } | null
}

interface PFMovement {
  id: string
  kind: 'pf'
  tipo: 'producao' | 'expedicao'
  nome_produto: string
  cx_verdes: number
  cx_amarelas: number
  cx_vermelhas: number
  data: string
  created_at: string
  profiles?: { nome: string } | null
}

interface PeliculaMovement {
  id: string
  kind: 'pelicula'
  tipo: 'entrada' | 'saida'
  nome_material: string
  quantidade_metros: number
  data: string
  created_at: string
  profiles?: { nome: string } | null
}

type Movement = MPMovement | PFMovement | PeliculaMovement

interface Props {
  movements: Movement[]
}

function MovementPill({ kind, tipo }: { kind: Movement['kind']; tipo: string }) {
  if (kind === 'mp') {
    return tipo === 'entrada' ? (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
        ↑ entrada
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
        ↓ consumo
      </span>
    )
  }
  if (kind === 'pelicula') {
    return tipo === 'entrada' ? (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
        ↑ entrada
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
        ↓ consumo
      </span>
    )
  }
  // pf
  return tipo === 'producao' ? (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
      📦 produção
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 shrink-0">
      🚚 expedição
    </span>
  )
}

function movementLabel(m: Movement): string {
  if (m.kind === 'mp') return `${m.nome_material} — ${(m as MPMovement).quantidade} kg`
  if (m.kind === 'pelicula')
    return `🎞️ ${m.nome_material} — ${(m as PeliculaMovement).quantidade_metros.toFixed(1)} m`
  const pf = m as PFMovement
  const total = pf.cx_verdes + pf.cx_amarelas + pf.cx_vermelhas
  return `${pf.nome_produto} — ${total} cx`
}

export function RecentMovements({ movements }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🕒 Últimas Movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <ul className="divide-y">
            {movements.map(m => (
              <li key={m.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <MovementPill kind={m.kind} tipo={m.tipo} />
                    <span className="text-sm text-slate-800 truncate">{movementLabel(m)}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {new Date(m.data).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                    {m.profiles?.nome && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {m.profiles.nome}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
