'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MateriaPrima } from '@/types'

interface Props {
  materias: Pick<MateriaPrima, 'id' | 'nome' | 'unidade' | 'estoque_minimo'>[]
}

export function MPCrud({ materias }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newUnidade, setNewUnidade] = useState('')
  const [newMinimo, setNewMinimo] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const [editValues, setEditValues] = useState<Record<string, { nome: string; unidade: string; estoque_minimo: string }>>(
    Object.fromEntries(materias.map(m => [m.id, { nome: m.nome, unidade: m.unidade, estoque_minimo: String(m.estoque_minimo) }]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  function setEdit(id: string, patch: Partial<{ nome: string; unidade: string; estoque_minimo: string }>) {
    setEditValues(p => ({ ...p, [id]: { ...p[id], ...patch } }))
  }

  async function handleCreate() {
    if (!newNome.trim() || !newUnidade.trim()) { setError('Nome e unidade são obrigatórios.'); return }
    const min = parseFloat(newMinimo)
    if (isNaN(min) || min < 0) { setError('Estoque mínimo inválido.'); return }
    setSavingNew(true); setError('')
    try {
      const { error: err } = await supabase.from('materias_primas').insert({
        nome: newNome.trim(), unidade: newUnidade.trim(), estoque_minimo: min,
      })
      if (err) { setError('Erro ao criar: ' + err.message); return }
      setNewNome(''); setNewUnidade(''); setNewMinimo(''); setShowNew(false)
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingNew(false) }
  }

  async function handleUpdate(id: string) {
    const val = editValues[id]
    if (!val.nome.trim() || !val.unidade.trim()) { setError('Nome e unidade são obrigatórios.'); return }
    const min = parseFloat(val.estoque_minimo)
    if (isNaN(min) || min < 0) { setError('Estoque mínimo inválido.'); return }
    setSavingId(id); setError('')
    try {
      const { error: err } = await supabase.from('materias_primas').update({
        nome: val.nome.trim(), unidade: val.unidade.trim(), estoque_minimo: min,
      }).eq('id', id)
      if (err) { setError('Erro ao salvar: ' + err.message); return }
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingId(null) }
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    setError('')
    try {
      const { error: err } = await supabase.from('materias_primas').delete().eq('id', id)
      if (err) { setError('Não é possível excluir: ' + err.message); return }
      router.refresh()
    } catch { setError('Erro inesperado.') }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Matérias-Primas</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Cancelar' : '+ Nova MP'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {showNew && (
          <div className="flex flex-wrap gap-2 items-end p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input className="w-40" value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Plastificante" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidade</Label>
              <Input className="w-20" value={newUnidade} onChange={e => setNewUnidade(e.target.value)} placeholder="kg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estoque mín.</Label>
              <Input className="w-24" type="number" min="0" step="0.1" value={newMinimo} onChange={e => setNewMinimo(e.target.value)} placeholder="0" />
            </div>
            <Button size="sm" onClick={handleCreate} disabled={savingNew}>
              {savingNew ? '...' : 'Criar'}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {materias.map(mp => (
            <div key={mp.id} className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input className="w-40" value={editValues[mp.id]?.nome ?? mp.nome}
                  onChange={e => setEdit(mp.id, { nome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unidade</Label>
                <Input className="w-20" value={editValues[mp.id]?.unidade ?? mp.unidade}
                  onChange={e => setEdit(mp.id, { unidade: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estoque mín.</Label>
                <Input className="w-24" type="number" min="0" step="0.1"
                  value={editValues[mp.id]?.estoque_minimo ?? String(mp.estoque_minimo)}
                  onChange={e => setEdit(mp.id, { estoque_minimo: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => handleUpdate(mp.id)} disabled={savingId === mp.id}>
                {savingId === mp.id ? '...' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(mp.id, mp.nome)}>
                Excluir
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
