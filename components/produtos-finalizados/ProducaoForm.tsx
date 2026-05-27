'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  produtoId: string
  onClose: () => void
}

export function ProducaoForm({ produtoId, onClose }: Props) {
  const router = useRouter()
  const [metros, setMetros] = useState('')
  const [verdes, setVerdes] = useState('')
  const [amarelas, setAmarelas] = useState('')
  const [vermelhas, setVermelhas] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const v = parseInt(verdes) || 0
    const a = parseInt(amarelas) || 0
    const r = parseInt(vermelhas) || 0
    if (v + a + r === 0) {
      setError('Informe ao menos uma caixa em alguma qualidade.')
      return
    }
    const m = parseFloat(metros)
    if (isNaN(m) || m <= 0) {
      setError('Metros por caixa deve ser maior que zero.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Sessão expirada. Faça login novamente.')
        return
      }
      const { error: err } = await supabase.from('movimentacoes_pf').insert({
        produto_id: produtoId,
        tipo: 'producao',
        metros_por_caixa: m,
        cx_verdes: v,
        cx_amarelas: a,
        cx_vermelhas: r,
        data,
        usuario_id: user.id,
        observacao: observacao.trim() || null,
      })
      if (err) {
        setError('Erro ao salvar. Tente novamente.')
        return
      }
      router.refresh()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="metros">Metros por caixa</Label>
        <Input
          id="metros"
          type="number"
          step="0.01"
          min="0.01"
          value={metros}
          onChange={e => setMetros(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-green-700">🟢 Verdes</Label>
          <Input
            type="number"
            min="0"
            value={verdes}
            onChange={e => setVerdes(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-amber-600">🟡 Amarelas</Label>
          <Input
            type="number"
            min="0"
            value={amarelas}
            onChange={e => setAmarelas(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-red-600">🔴 Vermelhas</Label>
          <Input
            type="number"
            min="0"
            value={vermelhas}
            onChange={e => setVermelhas(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="obs">Observação (opcional)</Label>
        <Input id="obs" value={observacao} onChange={e => setObservacao(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : 'Registrar Produção'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
