'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProducaoForm } from './ProducaoForm'
import { ExpedicaoForm } from './ExpedicaoForm'
import type { ProdutoFinalizadoComSaldo, MovimentacaoPF } from '@/types'

interface Props {
  produto: ProdutoFinalizadoComSaldo
  movimentacoes: MovimentacaoPF[]
}

export function PFDetail({ produto, movimentacoes }: Props) {
  const [dialog, setDialog] = useState<'producao' | 'expedicao' | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/produtos-finalizados" className="text-sm text-muted-foreground hover:text-foreground">
          ← Produtos Finalizados
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{produto.nome}</h1>
              <div className="flex gap-6 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total caixas</p>
                  <p className="text-3xl font-bold">{produto.saldo.total_caixas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Metros est.</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ~{produto.saldo.metros_estimados} m
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm font-semibold">
                <span className="text-green-700">🟢 {produto.saldo.cx_verdes} cx</span>
                <span className="text-amber-600">🟡 {produto.saldo.cx_amarelas} cx</span>
                <span className="text-red-600">🔴 {produto.saldo.cx_vermelhas} cx</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialog('producao')} className="bg-blue-600 hover:bg-blue-700">
                + Produção
              </Button>
              <Button onClick={() => setDialog('expedicao')} variant="outline">
                ↑ Expedição
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {movimentacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          )}
          <ul className="divide-y">
            {movimentacoes.map(mov => {
              const total = mov.cx_verdes + mov.cx_amarelas + mov.cx_vermelhas
              return (
                <li key={mov.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <span className={`font-semibold ${mov.tipo === 'producao' ? 'text-blue-700' : 'text-orange-600'}`}>
                      {mov.tipo === 'producao' ? '▲ Produção' : '▼ Expedição'}
                    </span>
                    {' — '}
                    {mov.tipo === 'producao'
                      ? `${total} cx · ${mov.metros_por_caixa} m/cx`
                      : `${total} cx`
                    }
                    {mov.tipo === 'producao' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        🟢{mov.cx_verdes} 🟡{mov.cx_amarelas} 🔴{mov.cx_vermelhas}
                      </span>
                    )}
                    {mov.observacao && (
                      <span className="text-muted-foreground ml-2">({mov.observacao})</span>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(mov.data).toLocaleDateString('pt-BR')}
                    <br />
                    {mov.profiles?.nome ?? '—'}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'producao'
                ? `Registrar Produção — ${produto.nome}`
                : dialog === 'expedicao'
                ? `Registrar Expedição — ${produto.nome}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {dialog === 'producao' && (
            <ProducaoForm produtoId={produto.id} onClose={() => setDialog(null)} />
          )}
          {dialog === 'expedicao' && (
            <ExpedicaoForm
              produtoId={produto.id}
              saldo={produto.saldo}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
