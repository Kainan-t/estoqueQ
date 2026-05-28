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

interface Props { movements: Movement[] }

export function RecentMovements({ movements }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Últimas movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
        )}
        <ul className="divide-y">
          {movements.map((m) => (
            <li key={m.id} className="py-2 flex justify-between text-sm">
              <div>
                {m.kind === 'mp' ? (
                  <span>
                    <span className={m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {m.tipo === 'entrada' ? '↑' : '↓'}
                    </span>{' '}
                    {m.tipo === 'entrada' ? 'Entrada' : 'Consumo'}: {m.nome_material} —{' '}
                    {(m as MPMovement).quantidade} kg
                  </span>
                ) : m.kind === 'pelicula' ? (
                  <span>
                    <span className={m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {m.tipo === 'entrada' ? '↑' : '↓'}
                    </span>{' '}
                    {m.tipo === 'entrada' ? 'Entrada' : 'Consumo'}: 🎞️ {(m as PeliculaMovement).nome_material} —{' '}
                    {(m as PeliculaMovement).quantidade_metros.toFixed(1)} m
                  </span>
                ) : (
                  <span>
                    <span className={m.tipo === 'producao' ? 'text-blue-600' : 'text-orange-600'}>
                      {m.tipo === 'producao' ? '📦' : '🚚'}
                    </span>{' '}
                    {m.tipo === 'producao' ? 'Produção' : 'Expedição'}: {(m as PFMovement).nome_produto}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(m.data).toLocaleDateString('pt-BR')} · {m.profiles?.nome ?? '—'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
