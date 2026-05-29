'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Pelicula } from '@/types'

type PeliculaRow = Pick<Pelicula, 'id' | 'nome' | 'largura' | 'tonalidade' | 'espessura' | 'protecao_uva' | 'protecao_uvb' | 'estoque_minimo'>
type EditPelicula = { nome: string; largura: string; tonalidade: string; espessura: string; protecao_uva: string; protecao_uvb: string; estoque_minimo: string }

interface Props { peliculas: PeliculaRow[] }

const emptyEdit = (): EditPelicula => ({ nome: '', largura: '', tonalidade: '', espessura: '', protecao_uva: '', protecao_uvb: '', estoque_minimo: '0' })

export function PeliculaCrud({ peliculas }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newFields, setNewFields] = useState<EditPelicula>(emptyEdit())
  const [savingNew, setSavingNew] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, EditPelicula>>(
    Object.fromEntries(peliculas.map(p => [p.id, {
      nome: p.nome, largura: p.largura, tonalidade: p.tonalidade,
      espessura: p.espessura, protecao_uva: p.protecao_uva,
      protecao_uvb: p.protecao_uvb, estoque_minimo: String(p.estoque_minimo),
    }]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  function setNew(patch: Partial<EditPelicula>) { setNewFields(p => ({ ...p, ...patch })) }
  function setEdit(id: string, patch: Partial<EditPelicula>) {
    setEditValues(p => ({ ...p, [id]: { ...p[id], ...patch } }))
  }

  function validate(f: EditPelicula): string | null {
    if (!f.nome.trim()) return 'Nome é obrigatório.'
    const min = parseFloat(f.estoque_minimo)
    if (isNaN(min) || min < 0) return 'Estoque mínimo inválido.'
    return null
  }

  async function handleCreate() {
    const err = validate(newFields)
    if (err) { setError(err); return }
    setSavingNew(true); setError('')
    try {
      const { error: e } = await supabase.from('peliculas').insert({
        nome: newFields.nome.trim(), largura: newFields.largura.trim(),
        tonalidade: newFields.tonalidade.trim(), espessura: newFields.espessura.trim(),
        protecao_uva: newFields.protecao_uva.trim(), protecao_uvb: newFields.protecao_uvb.trim(),
        estoque_minimo: parseFloat(newFields.estoque_minimo),
      })
      if (e) { setError('Erro ao criar: ' + e.message); return }
      setNewFields(emptyEdit()); setShowNew(false)
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingNew(false) }
  }

  async function handleUpdate(id: string) {
    const val = editValues[id]
    const err = validate(val)
    if (err) { setError(err); return }
    setSavingId(id); setError('')
    try {
      const { error: e } = await supabase.from('peliculas').update({
        nome: val.nome.trim(), largura: val.largura.trim(),
        tonalidade: val.tonalidade.trim(), espessura: val.espessura.trim(),
        protecao_uva: val.protecao_uva.trim(), protecao_uvb: val.protecao_uvb.trim(),
        estoque_minimo: parseFloat(val.estoque_minimo),
      }).eq('id', id)
      if (e) { setError('Erro ao salvar: ' + e.message); return }
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingId(null) }
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir película "${nome}"? Esta ação não pode ser desfeita.`)) return
    setError('')
    try {
      const { error: e } = await supabase.from('peliculas').delete().eq('id', id)
      if (e) { setError('Não é possível excluir: ' + e.message); return }
      router.refresh()
    } catch { setError('Erro inesperado.') }
  }

  const FieldRow = ({ f, onChange, onSave, onDelete, saving, isNew = false }: {
    f: EditPelicula; onChange: (patch: Partial<EditPelicula>) => void
    onSave: () => void; onDelete: () => void; saving: boolean; isNew?: boolean
  }) => (
    <div className={`space-y-2 p-3 rounded-lg border ${isNew ? 'border-dashed border-blue-300 bg-blue-50' : 'border-border'}`}>
      <div className="flex flex-wrap gap-2">
        <div className="space-y-1"><Label className="text-xs">Nome</Label>
          <Input className="w-40" value={f.nome} onChange={e => onChange({ nome: e.target.value })} placeholder="Ex: PS4 Clear" /></div>
        <div className="space-y-1"><Label className="text-xs">Largura</Label>
          <Input className="w-24" value={f.largura} onChange={e => onChange({ largura: e.target.value })} placeholder="1,52m" /></div>
        <div className="space-y-1"><Label className="text-xs">Tonalidade</Label>
          <Input className="w-24" value={f.tonalidade} onChange={e => onChange({ tonalidade: e.target.value })} placeholder="Clear" /></div>
        <div className="space-y-1"><Label className="text-xs">Espessura</Label>
          <Input className="w-20" value={f.espessura} onChange={e => onChange({ espessura: e.target.value })} placeholder="50µ" /></div>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><Label className="text-xs">Prot. UVA</Label>
          <Input className="w-20" value={f.protecao_uva} onChange={e => onChange({ protecao_uva: e.target.value })} placeholder="99%" /></div>
        <div className="space-y-1"><Label className="text-xs">Prot. UVB</Label>
          <Input className="w-20" value={f.protecao_uvb} onChange={e => onChange({ protecao_uvb: e.target.value })} placeholder="99%" /></div>
        <div className="space-y-1"><Label className="text-xs">Estoque mín. (m)</Label>
          <Input className="w-28" type="number" min="0" step="1" value={f.estoque_minimo}
            onChange={e => onChange({ estoque_minimo: e.target.value })} /></div>
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? '...' : isNew ? 'Criar' : 'Salvar'}</Button>
        {!isNew && (
          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Películas</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Cancelar' : '+ Nova Película'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {showNew && (
          <FieldRow f={newFields} onChange={setNew} onSave={handleCreate}
            onDelete={() => {}} saving={savingNew} isNew />
        )}
        {peliculas.map(p => (
          <FieldRow key={p.id}
            f={editValues[p.id] ?? { nome: p.nome, largura: p.largura, tonalidade: p.tonalidade, espessura: p.espessura, protecao_uva: p.protecao_uva, protecao_uvb: p.protecao_uvb, estoque_minimo: String(p.estoque_minimo) }}
            onChange={patch => setEdit(p.id, patch)}
            onSave={() => handleUpdate(p.id)}
            onDelete={() => handleDelete(p.id, p.nome)}
            saving={savingId === p.id}
          />
        ))}
      </CardContent>
    </Card>
  )
}
