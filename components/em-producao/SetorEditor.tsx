'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { upsertStatusSetor } from '@/lib/actions/em-producao'
import type { Setor } from '@/types'

interface Props {
  opId: string
  setor: Setor
  opcoes: { id: string; label: string }[]
  itemAtualId?: string
  onCancelar: () => void
}

export function SetorEditor({ opId, setor, opcoes, itemAtualId, onCancelar }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(itemAtualId ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    if (!selectedId) return
    setLoading(true)
    setErro('')
    try {
      await upsertStatusSetor({ op_id: opId, setor, item_id: selectedId })
      router.refresh()
      onCancelar()
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-1 flex-wrap">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="h-7 text-xs flex-1 min-w-[120px]">
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map(o => (
            <SelectItem key={o.id} value={o.id} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-7 text-xs px-3"
        onClick={handleSalvar}
        disabled={!selectedId || loading}
      >
        {loading ? '...' : 'Salvar'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        onClick={onCancelar}
        disabled={loading}
      >
        Cancelar
      </Button>
      {erro && <p className="text-xs text-red-600 w-full">{erro}</p>}
    </div>
  )
}
