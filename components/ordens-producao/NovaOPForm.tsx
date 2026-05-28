'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Mescla } from '@/types'

interface Props {
  peliculas: { id: string; nome: string; largura: string; tonalidade: string; espessura: string }[]
  mesclas: Mescla[]
}

type ItemForm = {
  id: string
  tipo_recurso: 'pelicula' | 'mescla'
  pelicula_id: string
  mescla_id: string
  quantidade: string
}

function newItem(): ItemForm {
  return {
    id: crypto.randomUUID(),
    tipo_recurso: 'mescla',
    pelicula_id: '',
    mescla_id: '',
    quantidade: '',
  }
}

export function NovaOPForm({ peliculas, mesclas }: Props) {
  const router = useRouter()
  const [observacao, setObservacao] = useState('')
  const [items, setItems] = useState<ItemForm[]>([newItem()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateItem(id: string, patch: Partial<ItemForm>) {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  function getMescla(id: string) {
    return mesclas.find(m => m.id === id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    for (const item of items) {
      const refId = item.tipo_recurso === 'pelicula' ? item.pelicula_id : item.mescla_id
      if (!refId) { setError('Selecione um item para cada linha.'); return }
      const qtd = parseFloat(item.quantidade)
      if (isNaN(qtd) || qtd <= 0) { setError('Quantidade deve ser maior que zero.'); return }
      if (item.tipo_recurso === 'mescla' && !Number.isInteger(qtd)) {
        setError('Número de mesclas deve ser inteiro.'); return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada. Faça login novamente.'); return }

      const { data: op, error: opErr } = await supabase
        .from('ordens_producao')
        .insert({ observacao: observacao.trim() || null, usuario_id: user.id })
        .select('id')
        .single()
      if (opErr || !op) { setError('Erro ao criar OP. Tente novamente.'); return }

      const itensPayload = items.map(item => ({
        ordem_id: op.id,
        pelicula_id: item.tipo_recurso === 'pelicula' ? item.pelicula_id : null,
        mescla_id: item.tipo_recurso === 'mescla' ? item.mescla_id : null,
        materia_prima_id: null,
        quantidade: parseFloat(item.quantidade),
      }))
      const { error: itensErr } = await supabase.from('ordens_producao_itens').insert(itensPayload)
      if (itensErr) {
        await supabase.from('ordens_producao').delete().eq('id', op.id)
        setError('Erro ao salvar itens. Tente novamente.')
        return
      }

      router.push('/ordens-producao')
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Observação</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <textarea
              id="observacao"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observações gerais sobre esta OP..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Itens da OP</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => {
            const mescla = item.tipo_recurso === 'mescla' ? getMescla(item.mescla_id) : null
            const qtd = parseFloat(item.quantidade)
            const showPreview = mescla && !isNaN(qtd) && qtd > 0 && Number.isInteger(qtd)

            return (
              <div key={item.id} className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  <Button
                    type="button" variant="outline" size="sm"
                    disabled={items.length === 1}
                    onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >×</Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Tipo */}
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select
                      value={item.tipo_recurso}
                      onValueChange={(value: 'pelicula' | 'mescla') =>
                        updateItem(item.id, { tipo_recurso: value, pelicula_id: '', mescla_id: '', quantidade: '' })
                      }
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mescla">⚗️ Mescla</SelectItem>
                        <SelectItem value="pelicula">🎞️ Película</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Item específico */}
                  <div className="space-y-1">
                    <Label>{item.tipo_recurso === 'pelicula' ? 'Película' : 'Receita'}</Label>
                    {item.tipo_recurso === 'pelicula' ? (
                      <Select
                        value={item.pelicula_id}
                        onValueChange={value => updateItem(item.id, { pelicula_id: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma película..." />
                        </SelectTrigger>
                        <SelectContent>
                          {peliculas.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} — {p.largura} / {p.tonalidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={item.mescla_id}
                        onValueChange={value => updateItem(item.id, { mescla_id: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a mescla..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mesclas.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-1">
                    <Label>{item.tipo_recurso === 'pelicula' ? 'Metros (m)' : 'Nº de mesclas'}</Label>
                    <Input
                      type="number"
                      step={item.tipo_recurso === 'mescla' ? '1' : '0.01'}
                      min="1"
                      value={item.quantidade}
                      onChange={e => updateItem(item.id, { quantidade: e.target.value })}
                      placeholder={item.tipo_recurso === 'mescla' ? '1' : '0.00'}
                    />
                  </div>
                </div>

                {/* Prévia dos ingredientes */}
                {showPreview && mescla.mescla_ingredientes && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs space-y-1">
                    <p className="font-semibold text-amber-800">
                      ⚗️ {mescla.nome} × {qtd} — consumo calculado:
                    </p>
                    {mescla.mescla_ingredientes.map(ing => (
                      <p key={ing.id} className="text-amber-700 pl-2">
                        {ing.materias_primas?.nome ?? '—'}:{' '}
                        <span className="font-medium">
                          {(ing.quantidade_por_mescla * qtd).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <Button
            type="button" variant="outline"
            onClick={() => setItems(prev => [...prev, newItem()])}
            className="w-full"
          >
            ＋ Adicionar item
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar OP'}
        </Button>
        <Button type="button" variant="outline" disabled={loading}
          onClick={() => router.push('/ordens-producao')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
