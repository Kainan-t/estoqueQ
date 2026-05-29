import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RegistroCorte } from '@/types'

interface Props { corte: RegistroCorte }

export function CorteDetail({ corte }: Props) {
  const total = corte.cx_verdes + corte.cx_amarelas + corte.cx_vermelhas
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h1 className="text-2xl font-bold">{corte.produtos_finalizados?.nome ?? '—'}</h1>
          <p className="text-sm text-muted-foreground">
            Data: {new Date(corte.data).toLocaleDateString('pt-BR')}
          </p>
          {corte.ordens_producao && (
            <p className="text-sm">
              OP:{' '}
              <Link href={`/ordens-producao/${corte.ordem_producao_id}`}
                className="font-medium text-blue-600 hover:underline">
                {corte.ordens_producao.numero}
              </Link>
            </p>
          )}
          {corte.metros_cortados != null && (
            <p className="text-sm">
              Metros cortados: <span className="font-medium">{corte.metros_cortados} m</span>
            </p>
          )}
          <p className="text-sm">
            Metros por caixa: <span className="font-medium">{corte.metros_por_caixa} m</span>
          </p>
          {corte.profiles?.nome && (
            <p className="text-sm text-muted-foreground">Operador: {corte.profiles.nome}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Qualificação</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-700">{corte.cx_verdes}</p>
              <p className="text-xs text-muted-foreground mt-1">🟢 Verdes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{corte.cx_amarelas}</p>
              <p className="text-xs text-muted-foreground mt-1">🟡 Amarelas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{corte.cx_vermelhas}</p>
              <p className="text-xs text-muted-foreground mt-1">🔴 Vermelhas</p>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Total: <span className="font-semibold text-foreground">{total} caixas</span>
          </p>
        </CardContent>
      </Card>

      {corte.observacao && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Observação</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{corte.observacao}</p>
          </CardContent>
        </Card>
      )}

      <Link href="/corte" className="text-sm text-muted-foreground hover:underline">
        ← Voltar para Corte
      </Link>
    </div>
  )
}
