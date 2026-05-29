'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Props {
  ops: { id: string; numero: string }[]
  produtos: { id: string; nome: string }[]
}

export function NovoCorteForm({ ops, produtos }: Props) {
  const router = useRouter()
  const [ordemId, setOrdemId] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [metrosCortados, setMetrosCortados] = useState('')
  const [metrosPorCaixa, setMetrosPorCaixa] = useState('152')
  const [verdes, setVerdes] = useState('')
  const [amarelas, setAmarelas] = useState('')
  const [vermelhas, setVermelhas] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!ordemId) { setError('Selecione a Ordem de Produção.'); return }
    if (!produtoId) { setError('Selecione o Produto Finalizado.'); return }
    const mc = parseFloat(metrosCortados)
    if (isNaN(mc) || mc <= 0) { setError('Metros cortados deve ser maior que zero.'); return }
    const mpc = parseFloat(metrosPorCaixa)
    if (isNaN(mpc) || mpc <= 0) { setError('Metros por caixa deve ser maior que zero.'); return }
    const v = parseInt(verdes) || 0
    const a = parseInt(amarelas) || 0
    const r = parseInt(vermelhas) || 0
    if (v + a + r === 0) { setError('Informe ao menos uma caixa em alguma qualidade.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada. Faça login novamente.'); return }
      const { error: err } = await supabase.from('movimentacoes_pf').insert({
        produto_id: produtoId,
        tipo: 'producao',
        ordem_producao_id: ordemId,
        metros_cortados: mc,
        metros_por_caixa: mpc,
        cx_verdes: v,
        cx_amarelas: a,
        cx_vermelhas: r,
        data,
        usuario_id: user.id,
        observacao: observacao.trim() || null,
      })
      if (err) { setError('Erro ao salvar: ' + err.message); return }
      router.push('/corte')
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Dados do Corte</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ordem de Produção</Label>
              <Select value={ordemId} onValueChange={setOrdemId}>
                <SelectTrigger><SelectValue placeholder="Selecione a OP emitida..." /></SelectTrigger>
                <SelectContent>
                  {ops.map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produto Finalizado</Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Metros cortados (m)</Label>
              <Input type="number" step="0.1" min="0.1" value={metrosCortados}
                onChange={e => setMetrosCortados(e.target.value)} placeholder="Ex: 3800" />
            </div>
            <div className="space-y-2">
              <Label>Metros por caixa</Label>
              <Input type="number" step="1" min="1" value={metrosPorCaixa}
                onChange={e => setMetrosPorCaixa(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Qualificação das Caixas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-green-700">🟢 Caixas Verdes</Label>
              <Input type="number" min="0" value={verdes}
                onChange={e => setVerdes(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label className="text-amber-600">🟡 Caixas Amarelas</Label>
              <Input type="number" min="0" value={amarelas}
                onChange={e => setAmarelas(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label className="text-red-600">🔴 Caixas Vermelhas</Label>
              <Input type="number" min="0" value={vermelhas}
                onChange={e => setVermelhas(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={observacao} onChange={e => setObservacao(e.target.value)}
              placeholder="Observações sobre o corte..." />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : '✂️ Registrar Corte'}
        </Button>
        <Button type="button" variant="outline" disabled={loading}
          onClick={() => router.push('/corte')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
