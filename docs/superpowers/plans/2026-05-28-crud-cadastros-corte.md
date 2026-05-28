# CRUD de Cadastros + Módulo de Corte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin CRUD for MPs/Películas/Mesclas inside the app, and create a dedicated Corte module where operators register cuts linked to OPs, feeding stock into Produtos Finalizados.

**Architecture:** Extend `movimentacoes_pf` with two nullable columns (`ordem_producao_id`, `metros_cortados`). New `/corte` section reads/writes `movimentacoes_pf` with `tipo='producao'`. CRUD blocks added as new child components inside the existing admin-gated `ConfiguracoesClient`. No new tables.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (direct client calls — no RPC), shadcn/ui (Card, Button, Input, Label, Select), Tailwind CSS.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `components/configuracoes/MPCrud.tsx` | Admin CRUD for matérias-primas |
| `components/configuracoes/PeliculaCrud.tsx` | Admin CRUD for películas |
| `components/configuracoes/MesclaCrud.tsx` | Admin CRUD for mesclas + ingredients |
| `lib/queries/corte.ts` | Server-side queries for Corte module |
| `components/corte/CorteList.tsx` | List of cut records |
| `components/corte/NovoCorteForm.tsx` | Client form to register a new cut |
| `components/corte/CorteDetail.tsx` | Read-only cut detail view |
| `app/(app)/corte/page.tsx` | Corte list page |
| `app/(app)/corte/novo/page.tsx` | New corte page |
| `app/(app)/corte/[id]/page.tsx` | Corte detail page |

### Modified files
| File | Change |
|---|---|
| `types/index.ts` | Add `ordem_producao_id`, `metros_cortados` to `MovimentacaoPF`; add `RegistroCorte` |
| `app/(app)/configuracoes/page.tsx` | Also fetch peliculas + mesclas + full MP fields |
| `app/(app)/configuracoes/ConfiguracoesClient.tsx` | Render 3 new CRUD blocks |
| `components/produtos-finalizados/PFDetail.tsx` | Remove "+ Produção" button and `ProducaoForm` dialog |
| `components/layout/Sidebar.tsx` | Add ✂️ Corte nav item |
| `components/layout/BottomNav.tsx` | Add ✂️ Corte nav item |

---

## Task 1: SQL Migration (manual — run in Supabase dashboard)

**⚠️ Run this BEFORE deploying any code changes.**

- [ ] **Step 1: Open Supabase SQL Editor in a new tab and run:**

```sql
ALTER TABLE public.movimentacoes_pf
  ADD COLUMN IF NOT EXISTS ordem_producao_id uuid
    REFERENCES public.ordens_producao(id),
  ADD COLUMN IF NOT EXISTS metros_cortados numeric;

NOTIFY pgrst, 'reload schema';
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Verify the columns exist:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'movimentacoes_pf'
  AND column_name IN ('ordem_producao_id', 'metros_cortados');
```

Expected: 2 rows returned.

---

## Task 2: Types Update

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add two new optional fields to `MovimentacaoPF` and add `RegistroCorte`**

In `types/index.ts`, replace the existing `MovimentacaoPF` interface and add `RegistroCorte` after it:

```typescript
export interface MovimentacaoPF {
  id: string
  produto_id: string
  tipo: TipoPF
  metros_por_caixa: number | null
  cx_verdes: number
  cx_amarelas: number
  cx_vermelhas: number
  data: string
  usuario_id: string
  observacao: string | null
  created_at: string
  ordem_producao_id?: string | null
  metros_cortados?: number | null
  profiles?: Pick<Profile, 'nome'>
}

export interface RegistroCorte extends MovimentacaoPF {
  tipo: 'producao'
  produtos_finalizados?: Pick<ProdutoFinalizado, 'nome'>
  ordens_producao?: Pick<OrdemProducao, 'numero'>
}
```

- [ ] **Step 2: Verify existing tests still pass (types are backward-compatible)**

```bash
npx jest --testPathPattern=calculations
```

Expected: all 9 tests pass (no type errors, only optional fields added).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add ordem_producao_id, metros_cortados to MovimentacaoPF + RegistroCorte type"
```

---

## Task 3: Corte Query Layer

**Files:**
- Create: `lib/queries/corte.ts`

- [ ] **Step 1: Create the file with all four queries**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { RegistroCorte } from '@/types'

const CORTE_SELECT = '*, produtos_finalizados(nome), ordens_producao(numero), profiles(nome)'

export async function getCortes(): Promise<RegistroCorte[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes_pf')
    .select(CORTE_SELECT)
    .eq('tipo', 'producao')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RegistroCorte[]
}

export async function getCorte(id: string): Promise<RegistroCorte | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes_pf')
    .select(CORTE_SELECT)
    .eq('id', id)
    .eq('tipo', 'producao')
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as RegistroCorte
}

export async function getOPsEmitidas(): Promise<{ id: string; numero: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordens_producao')
    .select('id, numero')
    .eq('status', 'emitida')
    .order('numero')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProdutosParaCorte(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produtos_finalizados')
    .select('id, nome')
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/corte.ts
git commit -m "feat: add Corte query layer"
```

---

## Task 4: MPCrud Component

**Files:**
- Create: `components/configuracoes/MPCrud.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/MPCrud.tsx
git commit -m "feat: MPCrud component for admin create/edit/delete matérias-primas"
```

---

## Task 5: PeliculaCrud Component

**Files:**
- Create: `components/configuracoes/PeliculaCrud.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
          <FieldRow key={p.id} f={editValues[p.id] ?? { nome: p.nome, largura: p.largura, tonalidade: p.tonalidade, espessura: p.espessura, protecao_uva: p.protecao_uva, protecao_uvb: p.protecao_uvb, estoque_minimo: String(p.estoque_minimo) }}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/PeliculaCrud.tsx
git commit -m "feat: PeliculaCrud component for admin create/edit/delete películas"
```

---

## Task 6: MesclaCrud Component

**Files:**
- Create: `components/configuracoes/MesclaCrud.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Mescla, MateriaPrima } from '@/types'

type IngredienteEdit = { materia_prima_id: string; quantidade_por_mescla: string }
type MesclaRow = Pick<Mescla, 'id' | 'nome'> & {
  mescla_ingredientes?: { id: string; materia_prima_id: string; quantidade_por_mescla: number; materias_primas?: { nome: string } }[]
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

  // Edit state
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
```

- [ ] **Step 2: Commit**

```bash
git add components/configuracoes/MesclaCrud.tsx
git commit -m "feat: MesclaCrud component for admin create/edit/delete mesclas and ingredients"
```

---

## Task 7: Update Configurações Page + Client

**Files:**
- Modify: `app/(app)/configuracoes/page.tsx`
- Modify: `app/(app)/configuracoes/ConfiguracoesClient.tsx`

- [ ] **Step 1: Update `app/(app)/configuracoes/page.tsx`**

Replace the entire file:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('cargo').eq('id', user.id).single()

  if (profile?.cargo !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta área.</p>
      </div>
    )
  }

  const [
    { data: materias },
    { data: peliculas },
    { data: mesclas },
    { data: qualidade },
    { data: usuarios },
  ] = await Promise.all([
    supabase.from('materias_primas').select('id, nome, unidade, estoque_minimo').order('nome'),
    supabase.from('peliculas').select('id, nome, largura, tonalidade, espessura, protecao_uva, protecao_uvb, estoque_minimo').order('nome'),
    supabase.from('mesclas').select('id, nome, mescla_ingredientes(id, materia_prima_id, quantidade_por_mescla, materias_primas(nome))').order('nome'),
    supabase.from('configuracoes_qualidade').select('*'),
    supabase.from('profiles').select('id, nome, cargo').order('nome'),
  ])

  return (
    <ConfiguracoesClient
      materias={materias ?? []}
      peliculas={peliculas ?? []}
      mesclas={mesclas ?? []}
      qualidade={qualidade ?? []}
      usuarios={usuarios ?? []}
    />
  )
}
```

- [ ] **Step 2: Update `app/(app)/configuracoes/ConfiguracoesClient.tsx`**

Add the three new imports and props, then render the three CRUD blocks at the bottom of the form. Replace the entire file:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MPCrud } from '@/components/configuracoes/MPCrud'
import { PeliculaCrud } from '@/components/configuracoes/PeliculaCrud'
import { MesclaCrud } from '@/components/configuracoes/MesclaCrud'
import type { MateriaPrima, ConfiguracaoQualidade, Profile, Pelicula, Mescla } from '@/types'

interface Props {
  materias: Pick<MateriaPrima, 'id' | 'nome' | 'unidade' | 'estoque_minimo'>[]
  peliculas: Pick<Pelicula, 'id' | 'nome' | 'largura' | 'tonalidade' | 'espessura' | 'protecao_uva' | 'protecao_uvb' | 'estoque_minimo'>[]
  mesclas: (Pick<Mescla, 'id' | 'nome'> & {
    mescla_ingredientes?: { id: string; materia_prima_id: string; quantidade_por_mescla: number; materias_primas?: { nome: string } }[]
  })[]
  qualidade: ConfiguracaoQualidade[]
  usuarios: Pick<Profile, 'id' | 'nome' | 'cargo'>[]
}

export function ConfiguracoesClient({ materias, peliculas, mesclas, qualidade, usuarios }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saveError, setSaveError] = useState('')

  // Estoque mínimo (existing — keep as-is, MPCrud handles full CRUD)
  const [minimoValues, setMinimoValues] = useState<Record<string, string>>(
    Object.fromEntries(materias.map(m => [m.id, String(m.estoque_minimo)]))
  )
  const [savingMinimo, setSavingMinimo] = useState<string | null>(null)

  async function salvarMinimo(id: string) {
    const val = parseFloat(minimoValues[id])
    if (isNaN(val) || val < 0) return
    setSavingMinimo(id)
    setSaveError('')
    try {
      const { error } = await supabase.from('materias_primas').update({ estoque_minimo: val }).eq('id', id)
      if (error) { setSaveError('Erro ao salvar estoque mínimo.'); return }
      router.refresh()
    } finally {
      setSavingMinimo(null)
    }
  }

  // Qualidade
  const corLabel: Record<string, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' }
  const [qualValues, setQualValues] = useState<Record<string, string>>(
    Object.fromEntries(qualidade.map(q => [q.cor, q.descricao]))
  )
  const [savingQual, setSavingQual] = useState<string | null>(null)

  async function salvarQualidade(cor: string) {
    setSavingQual(cor)
    setSaveError('')
    try {
      const { error } = await supabase.from('configuracoes_qualidade').update({ descricao: qualValues[cor] }).eq('cor', cor)
      if (error) { setSaveError('Erro ao salvar critério de qualidade.'); return }
      router.refresh()
    } finally {
      setSavingQual(null)
    }
  }

  // Cargo de usuário
  const [savingCargo, setSavingCargo] = useState<string | null>(null)

  async function alterarCargo(id: string, cargo: 'admin' | 'operador') {
    setSavingCargo(id)
    setSaveError('')
    try {
      const { error } = await supabase.from('profiles').update({ cargo }).eq('id', id)
      if (error) { setSaveError('Erro ao alterar cargo.'); return }
      router.refresh()
    } finally {
      setSavingCargo(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {saveError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</p>
      )}

      {/* Estoque mínimo (legacy quick-edit) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Estoque mínimo — Matérias-Primas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {materias.map(mp => (
              <div key={mp.id} className="flex items-center gap-3">
                <Label className="w-40 text-sm">{mp.nome}</Label>
                <Input type="number" min="0" step="0.1" className="w-28"
                  value={minimoValues[mp.id]}
                  onChange={e => setMinimoValues(p => ({ ...p, [mp.id]: e.target.value }))} />
                <span className="text-xs text-muted-foreground">{mp.unidade}</span>
                <Button size="sm" onClick={() => salvarMinimo(mp.id)} disabled={savingMinimo === mp.id}>
                  {savingMinimo === mp.id ? '...' : 'Salvar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critérios de qualidade */}
      <Card>
        <CardHeader><CardTitle className="text-base">Critérios de qualidade</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(['verde', 'amarelo', 'vermelho'] as const).map(cor => (
              <div key={cor} className="flex items-center gap-3">
                <span className="text-xl">{corLabel[cor]}</span>
                <Input className="flex-1"
                  value={qualValues[cor] ?? ''}
                  onChange={e => setQualValues(p => ({ ...p, [cor]: e.target.value }))} />
                <Button size="sm" onClick={() => salvarQualidade(cor)} disabled={savingQual === cor}>
                  {savingQual === cor ? '...' : 'Salvar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usuários */}
      <Card>
        <CardHeader><CardTitle className="text-base">Usuários</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {usuarios.map(u => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.nome}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {u.cargo === 'admin' ? 'Admin' : 'Operador'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {u.cargo !== 'admin' && (
                    <Button size="sm" variant="outline" onClick={() => alterarCargo(u.id, 'admin')}
                      disabled={savingCargo === u.id}>
                      {savingCargo === u.id ? '...' : 'Tornar Admin'}
                    </Button>
                  )}
                  {u.cargo !== 'operador' && (
                    <Button size="sm" variant="outline" onClick={() => alterarCargo(u.id, 'operador')}
                      disabled={savingCargo === u.id}>
                      {savingCargo === u.id ? '...' : 'Tornar Operador'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Para convidar novos usuários, vá ao painel do Supabase → Authentication → Invite user.
          </p>
        </CardContent>
      </Card>

      {/* CRUD Cadastros */}
      <MPCrud materias={materias} />
      <PeliculaCrud peliculas={peliculas} />
      <MesclaCrud mesclas={mesclas} materias={materias} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/configuracoes/page.tsx app/\(app\)/configuracoes/ConfiguracoesClient.tsx
git commit -m "feat: add CRUD de cadastros (MPs, Películas, Mesclas) em Configurações"
```

---

## Task 8: Corte Components

**Files:**
- Create: `components/corte/CorteList.tsx`
- Create: `components/corte/NovoCorteForm.tsx`
- Create: `components/corte/CorteDetail.tsx`

- [ ] **Step 1: Create `components/corte/CorteList.tsx`**

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { RegistroCorte } from '@/types'

interface Props { cortes: RegistroCorte[] }

export function CorteList({ cortes }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Corte</h1>
        <Link href="/corte/novo">
          <Button>✂️ Registrar Corte</Button>
        </Link>
      </div>

      {cortes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum corte registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {cortes.map(c => (
            <li key={c.id}>
              <Link href={`/corte/${c.id}`}
                className="flex items-start justify-between p-4 bg-white rounded-lg border hover:border-blue-300 transition-colors">
                <div>
                  <p className="font-medium">{c.produtos_finalizados?.nome ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    OP: <span className="font-medium">{c.ordens_producao?.numero ?? '—'}</span>
                    {c.metros_cortados != null && ` · ${c.metros_cortados} m cortados`}
                    {' · '}{new Date(c.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  <span className="text-green-700">🟢 {c.cx_verdes}</span>
                  <span className="text-amber-600">🟡 {c.cx_amarelas}</span>
                  <span className="text-red-600">🔴 {c.cx_vermelhas}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/corte/NovoCorteForm.tsx`**

```typescript
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
```

- [ ] **Step 3: Create `components/corte/CorteDetail.tsx`**

```typescript
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RegistroCorte } from '@/types'

interface Props { corte: RegistroCorte }

export function CorteDetail({ corte }: Props) {
  const total = corte.cx_verdes + corte.cx_amarelas + corte.cx_vermelhas
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h1 className="text-2xl font-bold">{corte.produtos_finalizados?.nome ?? '—'}</h1>
          <p className="text-sm text-muted-foreground">
            Data: {new Date(corte.data).toLocaleDateString('pt-BR')}
          </p>
          {corte.ordens_producao && (
            <p className="text-sm">
              OP:{' '}
              <Link href={`/ordens-producao/${corte.ordem_producao_id}`}
                className="font-medium text-blue-600 hover:underline">
                {corte.ordens_producao.numero}
              </Link>
            </p>
          )}
          {corte.metros_cortados != null && (
            <p className="text-sm">
              Metros cortados: <span className="font-medium">{corte.metros_cortados} m</span>
            </p>
          )}
          <p className="text-sm">
            Metros por caixa: <span className="font-medium">{corte.metros_por_caixa} m</span>
          </p>
          {corte.profiles?.nome && (
            <p className="text-sm text-muted-foreground">Operador: {corte.profiles.nome}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Qualificação</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-700">{corte.cx_verdes}</p>
              <p className="text-xs text-muted-foreground mt-1">🟢 Verdes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{corte.cx_amarelas}</p>
              <p className="text-xs text-muted-foreground mt-1">🟡 Amarelas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">{corte.cx_vermelhas}</p>
              <p className="text-xs text-muted-foreground mt-1">🔴 Vermelhas</p>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Total: <span className="font-semibold text-foreground">{total} caixas</span>
          </p>
        </CardContent>
      </Card>

      {corte.observacao && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Observação</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{corte.observacao}</p>
          </CardContent>
        </Card>
      )}

      <Link href="/corte" className="text-sm text-muted-foreground hover:underline">
        ← Voltar para Corte
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/corte/
git commit -m "feat: Corte components — CorteList, NovoCorteForm, CorteDetail"
```

---

## Task 9: Corte Pages

**Files:**
- Create: `app/(app)/corte/page.tsx`
- Create: `app/(app)/corte/novo/page.tsx`
- Create: `app/(app)/corte/[id]/page.tsx`

- [ ] **Step 1: Create `app/(app)/corte/page.tsx`**

```typescript
import { getCortes } from '@/lib/queries/corte'
import { CorteList } from '@/components/corte/CorteList'

export default async function CortePage() {
  const cortes = await getCortes()
  return <CorteList cortes={cortes} />
}
```

- [ ] **Step 2: Create `app/(app)/corte/novo/page.tsx`**

```typescript
import { getOPsEmitidas, getProdutosParaCorte } from '@/lib/queries/corte'
import { NovoCorteForm } from '@/components/corte/NovoCorteForm'

export default async function NovoCorterPage() {
  const [ops, produtos] = await Promise.all([
    getOPsEmitidas(),
    getProdutosParaCorte(),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registrar Corte</h1>
      <NovoCorteForm ops={ops} produtos={produtos} />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(app)/corte/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { getCorte } from '@/lib/queries/corte'
import { CorteDetail } from '@/components/corte/CorteDetail'

export default async function CorteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const corte = await getCorte(id)
  if (!corte) notFound()
  return <CorteDetail corte={corte} />
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/corte/
git commit -m "feat: Corte pages — list, novo, detail"
```

---

## Task 10: Remove ProducaoForm from PFDetail

**Files:**
- Modify: `components/produtos-finalizados/PFDetail.tsx`

- [ ] **Step 1: Update `PFDetail.tsx` — remove the "+ Produção" button and ProducaoForm dialog**

Replace the entire file:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExpedicaoForm } from './ExpedicaoForm'
import type { ProdutoFinalizadoComSaldo, MovimentacaoPF } from '@/types'

interface Props {
  produto: ProdutoFinalizadoComSaldo
  movimentacoes: MovimentacaoPF[]
}

export function PFDetail({ produto, movimentacoes }: Props) {
  const [dialog, setDialog] = useState<'expedicao' | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/produtos-finalizados" className="text-sm text-muted-foreground hover:text-foreground">
          ← Produtos Finalizados
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{produto.nome}</h1>
              <div className="flex gap-6 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total caixas</p>
                  <p className="text-3xl font-bold">{produto.saldo.total_caixas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Metros est.</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ~{produto.saldo.metros_estimados} m
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-sm font-semibold">
                <span className="text-green-700">🟢 {produto.saldo.cx_verdes} cx</span>
                <span className="text-amber-600">🟡 {produto.saldo.cx_amarelas} cx</span>
                <span className="text-red-600">🔴 {produto.saldo.cx_vermelhas} cx</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setDialog('expedicao')} variant="outline">
                ↑ Expedição
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {movimentacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          )}
          <ul className="divide-y">
            {movimentacoes.map(mov => {
              const total = mov.cx_verdes + mov.cx_amarelas + mov.cx_vermelhas
              return (
                <li key={mov.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <span className={`font-semibold ${mov.tipo === 'producao' ? 'text-blue-700' : 'text-orange-600'}`}>
                      {mov.tipo === 'producao' ? '▲ Corte' : '▼ Expedição'}
                    </span>
                    {' — '}
                    {mov.tipo === 'producao'
                      ? `${total} cx · ${mov.metros_por_caixa} m/cx`
                      : `${total} cx`
                    }
                    {mov.tipo === 'producao' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        🟢{mov.cx_verdes} 🟡{mov.cx_amarelas} 🔴{mov.cx_vermelhas}
                      </span>
                    )}
                    {mov.observacao && (
                      <span className="text-muted-foreground ml-2">({mov.observacao})</span>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(mov.data).toLocaleDateString('pt-BR')}
                    <br />
                    {mov.profiles?.nome ?? '—'}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Expedição — {produto.nome}</DialogTitle>
          </DialogHeader>
          {dialog === 'expedicao' && (
            <ExpedicaoForm
              produtoId={produto.id}
              saldo={produto.saldo}
              onClose={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/produtos-finalizados/PFDetail.tsx
git commit -m "feat: remove Produção button from PFDetail — production is now registered via Corte"
```

---

## Task 11: Navigation

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/BottomNav.tsx`

- [ ] **Step 1: Add Corte to `components/layout/Sidebar.tsx`**

In the `navItems` array, add after the OPs entry:

```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/materias-primas', label: 'Matéria-Prima', icon: '🧪' },
  { href: '/peliculas', label: 'Películas', icon: '🎞️' },
  { href: '/ordens-producao', label: 'Ordens de Produção', icon: '📋' },
  { href: '/corte', label: 'Corte', icon: '✂️' },
  { href: '/produtos-finalizados', label: 'Prod. Finalizado', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]
```

- [ ] **Step 2: Add Corte to `components/layout/BottomNav.tsx`**

```typescript
const navItems = [
  { href: '/dashboard', label: 'Início', icon: '📊' },
  { href: '/materias-primas', label: 'MP', icon: '🧪' },
  { href: '/peliculas', label: 'Pelíc.', icon: '🎞️' },
  { href: '/ordens-producao', label: 'OPs', icon: '📋' },
  { href: '/corte', label: 'Corte', icon: '✂️' },
  { href: '/produtos-finalizados', label: 'PF', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Config', icon: '⚙️' },
]
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/BottomNav.tsx
git commit -m "feat: add ✂️ Corte to navigation"
```

---

## Task 12: Build Check + Deploy

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -30
```

Expected: "✓ Compiled successfully", all routes listed with ƒ (dynamic).

- [ ] **Step 3: Deploy to production**

```bash
vercel deploy --prod
```

Expected: deployment URL printed, `state: READY`.

- [ ] **Step 4: Smoke test checklist**

After deploying:
- [ ] `/configuracoes` — verify 3 new CRUD blocks visible (MPs, Películas, Mesclas)
- [ ] Create one new MP → appears in list, shows in `/materias-primas`
- [ ] Create one new Película → appears in list, shows in `/peliculas`
- [ ] `/corte` — opens without error, shows "Nenhum corte registrado"
- [ ] `/corte/novo` — OPs dropdown shows emitidas, Produto dropdown shows products
- [ ] Register a corte → redirects to `/corte`, item appears in list
- [ ] Click corte → detail page shows OP link, metros, qualificação
- [ ] `/produtos-finalizados/[id]` — "+ Produção" button gone, only "Expedição"
- [ ] PF stock reflects the registered corte (caixas appeared in saldo)
