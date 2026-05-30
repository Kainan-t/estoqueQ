'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SetorEditor } from './SetorEditor'
import { concluirOP } from '@/lib/actions/em-producao'
import type { ItemEnriquecido, StatusSetorRow } from '@/types'

interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
}

const SETORES = [
  { key: 'quimico' as const, label: 'Químico', icon: '🧪' },
  { key: 'maquina' as const, label: 'Máquina', icon: '⚙️' },
  { key: 'corte' as const, label: 'Corte', icon: '✂️' },
]

function getOpcoes(
  setor: 'quimico' | 'maquina' | 'corte',
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

export function OPStatusCard({ op, itens, statusSetor }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<'quimico' | 'maquina' | 'corte' | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [erroConclui, setErroConclui] = useState('')

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

          return (
            <div key={key} className="flex items-center gap-2 text-sm min-h-[28px]">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 shrink-0"
                    onClick={() => setEditando(key)}
                  >
                    ✏️ Editar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-muted-foreground text-xs italic">
                    {opcoes.length === 0 ? 'Sem itens neste setor' : 'Não iniciado'}
                  </span>
                  {opcoes.length > 0 && (
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
          )
        })}

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
      </CardContent>
    </Card>
  )
}
