'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarLote, atualizarLote } from '@/lib/actions/em-producao'

interface Props {
  opId: string
  itemId: string
  loteId?: string          // presente = edição; ausente = criação
  numeroInicial: string    // número sugerido (auto) ou atual (edição)
  metragemInicial?: string // metragem atual (edição)
  onFechar: () => void
}

export function LoteEditor({
  opId,
  itemId,
  loteId,
  numeroInicial,
  metragemInicial,
  onFechar,
}: Props) {
  const router = useRouter()
  const [numero, setNumero] = useState(numeroInicial)
  const [metragem, setMetragem] = useState(metragemInicial ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    const m = parseFloat(metragem)
    if (!numero.trim()) {
      setErro('Informe o número do lote')
      return
    }
    if (isNaN(m) || m <= 0) {
      setErro('Metragem deve ser maior que zero')
      return
    }
    setLoading(true)
    setErro('')
    try {
      if (loteId) {
        await atualizarLote({ id: loteId, numero: numero.trim(), metragem: m })
      } else {
        await criarLote({ op_id: opId, item_id: itemId, numero: numero.trim(), metragem: m })
      }
      router.refresh()
      onFechar()
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <Input
        value={numero}
        onChange={e => setNumero(e.target.value)}
        className="h-7 text-xs w-36"
        placeholder="Número do lote"
      />
      <Input
        value={metragem}
        onChange={e => setMetragem(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        className="h-7 text-xs w-24"
        placeholder="Metros"
      />
      <Button
        size="sm"
        className="h-7 text-xs px-3"
        onClick={handleSalvar}
        disabled={loading}
      >
        {loading ? '...' : 'Salvar'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        onClick={onFechar}
        disabled={loading}
      >
        Cancelar
      </Button>
      {erro && <p className="text-xs text-red-600 w-full">{erro}</p>}
    </div>
  )
}
