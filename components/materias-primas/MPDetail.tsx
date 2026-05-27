'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MovimentacaoMPForm } from './MovimentacaoMPForm'
import type { MateriaPrimaComSaldo } from '@/types'

interface Props { mp: MateriaPrimaComSaldo }

export function MPDetail({ mp }: Props) {
  const [dialog, setDialog] = useState<'entrada' | 'saida' | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/materias-primas" className="text-sm text-muted-foreground hover:text-foreground">
          ← Matérias-Primas
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{mp.nome}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Estoque mínimo: {mp.estoque_minimo} {mp.unidade}
              </p>
              <p className={`text-3xl font-bold mt-3 ${mp.em_alerta ? 'text-amber-600' : 'text-green-700'}`}>
                {mp.saldo.toFixed(1)}{' '}
                <span className="text-base font-normal text-muted-foreground">{mp.unidade}</span>
              </p>
              {mp.em_alerta && (
                <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-300">
                  ⚠️ Abaixo do mínimo
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialog('entrada')} className="bg-green-600 hover:bg-green-700">
                + Entrada
              </Button>
              <Button
                onClick={() => setDialog('saida')}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                − Consumo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {(mp.movimentacoes ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          )}
          <ul className="divide-y">
            {(mp.movimentacoes ?? []).map(mov => (
              <li key={mov.id} className="py-3 flex justify-between text-sm">
                <div>
                  <span className={`font-semibold ${mov.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                    {mov.tipo === 'entrada' ? '▲ Entrada' : '▼ Consumo'}
                  </span>{' '}
                  — {mov.quantidade.toFixed(1)} kg
                  {mov.observacao && (
                    <span className="text-muted-foreground ml-2">({mov.observacao})</span>
                  )}
                </div>
                <div className="text-right text-muted-foreground text-xs">
                  {new Date(mov.data).toLocaleDateString('pt-BR')}
                  <br />
                  {mov.profiles?.nome ?? '—'}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === 'entrada' ? 'Registrar Entrada' : 'Registrar Consumo'} — {mp.nome}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <MovimentacaoMPForm
              materiaPrimaId={mp.id}
              tipo={dialog}
              saldoAtual={mp.saldo}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
