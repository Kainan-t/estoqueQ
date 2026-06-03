'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SetorEditor } from './SetorEditor'
import { LoteEditor } from './LoteEditor'
import { concluirOP, excluirLote } from '@/lib/actions/em-producao'
import { codigoLote, proximoNumeroLote } from '@/lib/lotes'
import type { ItemEnriquecido, StatusSetorRow, LoteProducao, Cargo, Setor } from '@/types'

interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
  lotes: LoteProducao[]
  meuCargo: Cargo
  meuSetor: Setor | null
}

const SETORES = [
  { key: 'quimico' as const, label: 'Químico', icon: '🧪' },
  { key: 'maquina' as const, label: 'Máquina', icon: '⚙️' },
  { key: 'corte' as const, label: 'Corte', icon: '✂️' },
]

function getOpcoes(
  setor: Setor,
  itens: ItemEnriquecido[]
): { id: string; label: string }[] {
  if (setor === 'quimico') {
    return itens
      .filter(i => i.mescla_id && i.mesclas)
      .map(i => ({ id: i.id, label: i.mesclas!.nome }))
  }
  return itens
    .filter(i => i.pelicula_id && i.peliculas)
    .map(i => ({
      id: i.id,
      label:
        setor === 'maquina'
          ? `${i.peliculas!.nome} — ${i.quantidade}m`
          : i.peliculas!.nome,
    }))
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export function OPStatusCard({ op, itens, statusSetor, lotes, meuCargo, meuSetor }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<Setor | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [erroConclui, setErroConclui] = useState('')

  // Lotes: qual está em edição/criação. `novo:<itemId>` para criação, ou o id do lote em edição.
  const [loteEditando, setLoteEditando] = useState<string | null>(null)
  const [erroLote, setErroLote] = useState('')

  const canEditSetor = (key: Setor) =>
    meuCargo === 'admin' || meuSetor === key

  const canConcluir = meuCargo === 'admin'
  const canEditarLotes = meuCargo === 'admin' || meuSetor === 'maquina'

  const peliculasDaOP = itens.filter(i => i.pelicula_id && i.peliculas)

  async function handleExcluirLote(id: string) {
    if (!window.confirm('Excluir este lote? Esta ação não pode ser desfeita.')) return
    setErroLote('')
    try {
      await excluirLote(id)
      router.refresh()
    } catch (err: any) {
      setErroLote(err.message ?? 'Erro ao excluir lote')
    }
  }

  async function handleConcluir() {
    setConcluindo(true)
    setErroConclui('')
    try {
      await concluirOP(op.id)
      router.refresh()
    } catch (err: any) {
      setErroConclui(err.message ?? 'Erro ao concluir')
    } finally {
      setConcluindo(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-semibold">{op.numero}</span>
            <span className="text-xs text-muted-foreground ml-2">
              Emitida em{' '}
              {new Date(op.emitida_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs hover:bg-blue-100 shrink-0">
            emitida
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SETORES.map(({ key, label, icon }) => {
          const status = statusSetor.find(s => s.setor === key)
          const opcoes = getOpcoes(key, itens)
          const itemAtual = status ? opcoes.find(o => o.id === status.item_id) : undefined
          const podeEditar = canEditSetor(key)

          return (
            <div key={key} className="text-sm min-h-[28px]">
              <div className="flex items-center gap-2">
                <span className="w-20 text-muted-foreground font-medium shrink-0 text-xs">
                  {icon} {label}
                </span>
                {editando === key ? (
                  <SetorEditor
                    opId={op.id}
                    setor={key}
                    opcoes={opcoes}
                    itemAtualId={status?.item_id}
                    onCancelar={() => setEditando(null)}
                  />
                ) : status && itemAtual ? (
                  <>
                    <span className="flex-1 text-slate-800 text-xs">{itemAtual.label} ✓</span>
                    {podeEditar && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 shrink-0"
                        onClick={() => setEditando(key)}
                      >
                        ✏️ Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-muted-foreground text-xs italic">
                      {opcoes.length === 0 ? 'Sem itens neste setor' : 'Não iniciado'}
                    </span>
                    {opcoes.length > 0 && podeEditar && (
                      <Button
                        size="sm"
                        className="h-6 text-xs px-2 shrink-0"
                        onClick={() => setEditando(key)}
                      >
                        ▶ Iniciar
                      </Button>
                    )}
                  </>
                )}
              </div>
              {status && itemAtual && status.usuario_nome && (
                <p className="text-[10px] text-muted-foreground ml-[88px] mt-0.5">
                  por {status.usuario_nome} • {formatDateTime(status.updated_at)}
                </p>
              )}
            </div>
          )
        })}

        {peliculasDaOP.length > 0 && (
          <div className="border-t pt-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">📦 Lotes Produzidos</p>
            {erroLote && <p className="text-xs text-red-600">{erroLote}</p>}
            {peliculasDaOP.map(item => {
              const lotesItem = lotes
                .filter(l => l.item_id === item.id)
                .sort((a, b) => a.numero.localeCompare(b.numero))
              const cod = codigoLote(item.peliculas!.codigo, item.peliculas!.nome)
              const numeroSugerido = proximoNumeroLote(
                op.numero,
                cod,
                lotesItem.map(l => l.numero)
              )
              const criandoEste = loteEditando === `novo:${item.id}`

              return (
                <div key={item.id} className="text-xs">
                  <p className="font-medium text-slate-700">{item.peliculas!.nome}</p>
                  {lotesItem.length === 0 && !criandoEste && (
                    <p className="text-muted-foreground italic ml-3">Nenhum lote registrado</p>
                  )}
                  {lotesItem.map(lote =>
                    loteEditando === lote.id ? (
                      <LoteEditor
                        key={lote.id}
                        opId={op.id}
                        itemId={item.id}
                        loteId={lote.id}
                        numeroInicial={lote.numero}
                        metragemInicial={String(lote.metragem)}
                        onFechar={() => setLoteEditando(null)}
                      />
                    ) : (
                      <div key={lote.id} className="ml-3 flex items-center gap-2">
                        <span className="text-slate-800">
                          {lote.numero} — {lote.metragem}m
                        </span>
                        {lote.usuario_nome && (
                          <span className="text-[10px] text-muted-foreground">
                            por {lote.usuario_nome} • {formatDateTime(lote.created_at)}
                          </span>
                        )}
                        {canEditarLotes && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1 shrink-0"
                              onClick={() => setLoteEditando(lote.id)}
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1 shrink-0 text-red-600"
                              onClick={() => handleExcluirLote(lote.id)}
                            >
                              🗑️
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  )}
                  {criandoEste ? (
                    <LoteEditor
                      opId={op.id}
                      itemId={item.id}
                      numeroInicial={numeroSugerido}
                      onFechar={() => setLoteEditando(null)}
                    />
                  ) : (
                    canEditarLotes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 ml-3 text-blue-700"
                        onClick={() => setLoteEditando(`novo:${item.id}`)}
                      >
                        + Adicionar lote
                      </Button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}

        {canConcluir && (
          <div className="pt-1 flex flex-col items-end gap-1">
            {erroConclui && (
              <p className="text-xs text-red-600 self-start">{erroConclui}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleConcluir}
              disabled={concluindo}
            >
              {concluindo ? 'Concluindo...' : '✅ Marcar como Concluída'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
