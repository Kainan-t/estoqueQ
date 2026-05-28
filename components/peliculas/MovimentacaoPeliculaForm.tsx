'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  peliculaId: string
  tipo: 'entrada' | 'saida'
  saldoAtual: number
  onClose: () => void
}

export function MovimentacaoPeliculaForm({ peliculaId, tipo, saldoAtual, onClose }: Props) {
  const router = useRouter()
  const [metros, setMetros] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const qtd = parseFloat(metros)
    if (isNaN(qtd) || qtd <= 0) { setError('Quantidade deve ser maior que zero.'); return }
    if (tipo === 'saida' && qtd > saldoAtual) {
      setError(`Saldo insuficiente. Disponível: ${saldoAtual.toFixed(1)} m`)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada. Faça login novamente.'); return }
      const { error: err } = await supabase.from('movimentacoes_pelicula').insert({
        pelicula_id: peliculaId,
        tipo,
        quantidade_metros: qtd,
        data,
        usuario_id: user.id,
        observacao: observacao || null,
      })
      if (err) { setError('Erro ao salvar. Tente novamente.'); return }
      router.refresh()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Metros lineares</Label>
        <Input type="number" step="0.01" min="0.01" value={metros}
          onChange={e => setMetros(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Observação (opcional)</Label>
        <Input value={observacao} onChange={e => setObservacao(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : `Registrar ${tipo === 'entrada' ? 'Entrada' : 'Consumo'}`}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  )
}
