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
import type { Mescla, MateriaPrima } from '@/types'

type IngredienteEdit = { materia_prima_id: string; quantidade_por_mescla: string }
type MesclaRow = Pick<Mescla, 'id' | 'nome'> & {
  mescla_ingredientes?: {
    id: string
    materia_prima_id: string
    quantidade_por_mescla: number
    materias_primas?: { nome: string }
  }[]
}

interface Props {
  mesclas: MesclaRow[]
  materias: Pick<MateriaPrima, 'id' | 'nome'>[]
}

function newIngrediente(): IngredienteEdit {
  return { materia_prima_id: '', quantidade_por_mescla: '' }
}

export function MesclaCrud({ mesclas, materias }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')

  // New mescla form
  const [showNew, setShowNew] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newIngredientes, setNewIngredientes] = useState<IngredienteEdit[]>([newIngrediente()])
  const [savingNew, setSavingNew] = useState(false)

  // Edit state: only one mescla can be in edit mode at a time
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editIngredientes, setEditIngredientes] = useState<IngredienteEdit[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  function startEdit(m: MesclaRow) {
    setEditingId(m.id)
    setEditNome(m.nome)
    setEditIngredientes(
      (m.mescla_ingredientes ?? []).map(i => ({
        materia_prima_id: i.materia_prima_id,
        quantidade_por_mescla: String(i.quantidade_por_mescla),
      }))
    )
    setError('')
  }

  function updateNewIng(idx: number, patch: Partial<IngredienteEdit>) {
    setNewIngredientes(p => p.map((i, n) => n === idx ? { ...i, ...patch } : i))
  }

  function updateEditIng(idx: number, patch: Partial<IngredienteEdit>) {
    setEditIngredientes(p => p.map((i, n) => n === idx ? { ...i, ...patch } : i))
  }

  function validateIngredientes(ings: IngredienteEdit[]): string | null {
    for (const ing of ings) {
      if (!ing.materia_prima_id) return 'Selecione a matéria-prima de todos os ingredientes.'
      const q = parseFloat(ing.quantidade_por_mescla)
      if (isNaN(q) || q <= 0) return 'Quantidade deve ser maior que zero em todos os ingredientes.'
    }
    return null
  }

  async function handleCreate() {
    if (!newNome.trim()) { setError('Nome da mescla é obrigatório.'); return }
    if (newIngredientes.length === 0) { setError('Adicione ao menos um ingrediente.'); return }
    const ingErr = validateIngredientes(newIngredientes)
    if (ingErr) { setError(ingErr); return }
    setSavingNew(true); setError('')
    try {
      const { data: mescla, error: mErr } = await supabase
        .from('mesclas').insert({ nome: newNome.trim() }).select('id').single()
      if (mErr || !mescla) { setError('Erro ao criar mescla: ' + mErr?.message); return }
      const { error: iErr } = await supabase.from('mescla_ingredientes').insert(
        newIngredientes.map(i => ({
          mescla_id: mescla.id,
          materia_prima_id: i.materia_prima_id,
          quantidade_por_mescla: parseFloat(i.quantidade_por_mescla),
        }))
      )
      if (iErr) {
        await supabase.from('mesclas').delete().eq('id', mescla.id)
        setError('Erro ao salvar ingredientes: ' + iErr.message); return
      }
      setNewNome(''); setNewIngredientes([newIngrediente()]); setShowNew(false)
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingNew(false) }
  }

  async function handleUpdate(id: string) {
    if (!editNome.trim()) { setError('Nome da mescla é obrigatório.'); return }
    const ingErr = validateIngredientes(editIngredientes)
    if (ingErr) { setError(ingErr); return }
    setSavingEdit(true); setError('')
    try {
      const { error: mErr } = await supabase.from('mesclas').update({ nome: editNome.trim() }).eq('id', id)
      if (mErr) { setError('Erro ao salvar nome: ' + mErr.message); return }
      const { error: delErr } = await supabase.from('mescla_ingredientes').delete().eq('mescla_id', id)
      if (delErr) { setError('Erro ao atualizar ingredientes: ' + delErr.message); return }
      if (editIngredientes.length > 0) {
        const { error: iErr } = await supabase.from('mescla_ingredientes').insert(
          editIngredientes.map(i => ({
            mescla_id: id,
            materia_prima_id: i.materia_prima_id,
            quantidade_por_mescla: parseFloat(i.quantidade_por_mescla),
          }))
        )
        if (iErr) { setError('Erro ao salvar ingredientes: ' + iErr.message); return }
      }
      setEditingId(null)
      router.refresh()
    } catch { setError('Erro inesperado.') } finally { setSavingEdit(false) }
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir mescla "${nome}"? Esta ação não pode ser desfeita.`)) return
    setError('')
    try {
      const { error: e } = await supabase.from('mesclas').delete().eq('id', id)
      if (e) { setError('Não é possível excluir: ' + e.message); return }
      router.refresh()
    } catch { setError('Erro inesperado.') }
  }

  const IngredienteRows = ({ ings, onChange, onAdd, onRemove }: {
    ings: IngredienteEdit[]
    onChange: (idx: number, patch: Partial<IngredienteEdit>) => void
    onAdd: () => void
    onRemove: (idx: number) => void
  }) => (
    <div className="space-y-2 mt-2">
      {ings.map((ing, idx) => (
        <div key={idx} className="flex gap-2 items-end">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Matéria-Prima</Label>
            <Select value={ing.materia_prima_id} onValueChange={v => onChange(idx, { materia_prima_id: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">kg/mescla</Label>
            <Input className="w-24" type="number" step="0.01" min="0.01"
              value={ing.quantidade_por_mescla}
              onChange={e => onChange(idx, { quantidade_por_mescla: e.target.value })} />
          </div>
          <Button type="button" size="sm" variant="outline"
            className="border-red-300 text-red-600 h-9 w-9 p-0"
            onClick={() => onRemove(idx)} disabled={ings.length === 1}>×</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={onAdd} className="w-full">
        + Ingrediente
      </Button>
    </div>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Mesclas</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Cancelar' : '+ Nova Mescla'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {showNew && (
          <div className="p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome da mescla</Label>
              <Input className="w-48" value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Mescla PX" />
            </div>
            <IngredienteRows
              ings={newIngredientes}
              onChange={updateNewIng}
              onAdd={() => setNewIngredientes(p => [...p, newIngrediente()])}
              onRemove={idx => setNewIngredientes(p => p.filter((_, n) => n !== idx))}
            />
            <Button size="sm" onClick={handleCreate} disabled={savingNew}>
              {savingNew ? '...' : 'Criar Mescla'}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {mesclas.map(m => (
            <div key={m.id} className="p-3 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">⚗️ {m.nome}</p>
                <div className="flex gap-2">
                  {editingId !== m.id && (
                    <Button size="sm" variant="outline" onClick={() => startEdit(m)}>Editar</Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(m.id, m.nome)}>Excluir</Button>
                </div>
              </div>

              {editingId === m.id ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input className="w-48" value={editNome} onChange={e => setEditNome(e.target.value)} />
                  </div>
                  <IngredienteRows
                    ings={editIngredientes}
                    onChange={updateEditIng}
                    onAdd={() => setEditIngredientes(p => [...p, newIngrediente()])}
                    onRemove={idx => setEditIngredientes(p => p.filter((_, n) => n !== idx))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(m.id)} disabled={savingEdit}>
                      {savingEdit ? '...' : 'Salvar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <ul className="text-xs text-muted-foreground space-y-0.5 pl-2">
                  {(m.mescla_ingredientes ?? []).map(ing => (
                    <li key={ing.id}>
                      {ing.materias_primas?.nome ?? '—'}: <span className="font-medium">{ing.quantidade_por_mescla} kg</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
