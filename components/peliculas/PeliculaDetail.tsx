'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MovimentacaoPeliculaForm } from './MovimentacaoPeliculaForm'
import type { PeliculaComSaldo } from '@/types'

interface Props { pelicula: PeliculaComSaldo }

export function PeliculaDetail({ pelicula }: Props) {
  const [dialog, setDialog] = useState<'entrada' | 'saida' | null>(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{pelicula.nome}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{pelicula.largura}</Badge>
                <Badge variant="outline">{pelicula.tonalidade}</Badge>
                <Badge variant="outline">{pelicula.espessura}</Badge>
                <Badge variant="outline">UVA {pelicula.protecao_uva}</Badge>
                <Badge variant="outline">UVB {pelicula.protecao_uvb}</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Estoque mínimo: {pelicula.estoque_minimo} m
              </p>
              <p className={`text-3xl font-bold mt-3 ${pelicula.em_alerta ? 'text-amber-600' : 'text-green-700'}`}>
                {pelicula.saldo.toFixed(1)} <span className="text-base font-normal text-muted-foreground">metros</span>
              </p>
              {pelicula.em_alerta && <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-300">⚠️ Abaixo do mínimo</Badge>}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialog('entrada')} className="bg-green-600 hover:bg-green-700">+ Entrada</Button>
              <Button onClick={() => setDialog('saida')} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">− Consumo</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Histórico de movimentações</CardTitle></CardHeader>
        <CardContent>
          {(pelicula.movimentacoes ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          )}
          <ul className="divide-y">
            {(pelicula.movimentacoes ?? []).map(mov => (
              <li key={mov.id} className="py-3 flex justify-between text-sm">
                <div>
                  <span className={`font-semibold ${mov.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                    {mov.tipo === 'entrada' ? '▲ Entrada' : '▼ Consumo'}
                  </span>{' '}
                  — {mov.quantidade_metros.toFixed(1)} m
                  {mov.observacao && <span className="text-muted-foreground ml-2">({mov.observacao})</span>}
                </div>
                <div className="text-right text-muted-foreground text-xs">
                  {new Date(mov.data).toLocaleDateString('pt-BR')}<br />
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
            <DialogTitle>{dialog === 'entrada' ? 'Registrar Entrada' : 'Registrar Consumo'} — {pelicula.nome}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <MovimentacaoPeliculaForm
              peliculaId={pelicula.id}
              tipo={dialog}
              saldoAtual={pelicula.saldo}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
