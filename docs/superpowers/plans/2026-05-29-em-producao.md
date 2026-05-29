# Em Produção — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o módulo "Em Produção" — uma página dedicada onde cada setor (Químico, Máquina, Corte) registra manualmente qual item da OP está executando no momento, com um card de resumo no dashboard.

**Architecture:** Nova tabela `status_setor` armazena uma linha por (OP × setor). Server Actions fazem upsert e conclusão de OP. A página `/em-producao` é Server + Client components. O dashboard ganha um card que lê da mesma tabela via queries `.in()` separadas (sem joins PostgREST).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase SSR + Server Actions, shadcn/ui (Card, Badge, Button, Select), Tailwind CSS.

---

## File Map

**Create:**
- `lib/actions/em-producao.ts` — Server Actions: `upsertStatusSetor`, `concluirOP`
- `lib/queries/em-producao.ts` — Query: `getOPsEmProducao()`
- `components/em-producao/SetorEditor.tsx` — Client: dropdown inline para editar setor
- `components/em-producao/OPStatusCard.tsx` — Client: card de uma OP com 3 linhas de setor
- `components/em-producao/EmProducaoList.tsx` — Server: lista de OPStatusCards
- `app/(app)/em-producao/page.tsx` — Server page
- `components/dashboard/EmProducaoAgora.tsx` — Dashboard card (Server)

**Modify:**
- `types/index.ts` — Add `StatusSetorRow`, `ItemEnriquecido`, `OPEmProducao`; update `StatusOP`
- `components/dashboard/RecentOPs.tsx` — Handle badge `'concluida'`
- `app/(app)/dashboard/page.tsx` — Add Em Produção queries + card
- `components/layout/Sidebar.tsx` — Add nav item
- `components/layout/BottomNav.tsx` — Add nav item

---

## Task 1: SQL Migration (manual)

**Files:** Supabase SQL Editor (manual step — no code files to commit)

- [ ] **Step 1: Abrir Supabase SQL Editor e executar o seguinte SQL**

```sql
CREATE TABLE status_setor (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  op_id       uuid NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  setor       text NOT NULL CHECK (setor IN ('quimico', 'maquina', 'corte')),
  item_id     uuid NOT NULL REFERENCES ordens_producao_itens(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  usuario_id  uuid REFERENCES auth.users(id),
  UNIQUE(op_id, setor)
);
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Verificar que a tabela foi criada**

No Table Editor do Supabase, a tabela `status_setor` deve aparecer com as colunas: `id`, `op_id`, `setor`, `item_id`, `updated_at`, `usuario_id`.

---

## Task 2: Types Update

**Files:**
- Modify: `types/index.ts`
- Modify: `components/dashboard/RecentOPs.tsx`

- [ ] **Step 1: Atualizar `types/index.ts`**

Adicionar após a linha `export type StatusOP = 'rascunho' | 'emitida' | 'cancelada'`:

```typescript
export type StatusOP = 'rascunho' | 'emitida' | 'concluida' | 'cancelada'

export interface StatusSetorRow {
  id: string
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_id: string
  updated_at: string
  usuario_id: string | null
}

export interface ItemEnriquecido {
  id: string
  ordem_id: string
  pelicula_id: string | null
  mescla_id: string | null
  quantidade: number
  peliculas?: { nome: string }
  mesclas?: { nome: string }
}

export interface OPEmProducao {
  id: string
  numero: string
  emitida_at: string
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
}
```

- [ ] **Step 2: Atualizar StatusBadge em `components/dashboard/RecentOPs.tsx`**

Localizar a função `StatusBadge` e adicionar o case `'concluida'`:

```typescript
interface OP {
  id: string
  numero: string
  status: 'rascunho' | 'emitida' | 'concluida' | 'cancelada'
  created_at: string
  emitida_at: string | null
  observacao: string | null
}

function StatusBadge({ status }: { status: OP['status'] }) {
  if (status === 'rascunho')
    return (
      <Badge variant="outline" className="text-xs shrink-0">
        Rascunho
      </Badge>
    )
  if (status === 'emitida')
    return (
      <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs shrink-0 hover:bg-blue-100">
        Emitida
      </Badge>
    )
  if (status === 'concluida')
    return (
      <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs shrink-0 hover:bg-green-100">
        Concluída
      </Badge>
    )
  if (status === 'cancelada')
    return (
      <Badge variant="destructive" className="text-xs shrink-0">
        Cancelada
      </Badge>
    )
  return null
}
```

- [ ] **Step 3: Verificar tipagem**

```bash
cd C:\Users\kaina\estoqueq && npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts components/dashboard/RecentOPs.tsx
git commit -m "feat: add StatusSetorRow, OPEmProducao types; add concluida OP status"
```

---

## Task 3: Server Actions

**Files:**
- Create: `lib/actions/em-producao.ts`

- [ ] **Step 1: Criar `lib/actions/em-producao.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function upsertStatusSetor(data: {
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('status_setor')
    .upsert(
      {
        op_id: data.op_id,
        setor: data.setor,
        item_id: data.item_id,
        updated_at: new Date().toISOString(),
        usuario_id: user?.id ?? null,
      },
      { onConflict: 'op_id,setor' }
    )
  if (error) throw new Error(error.message)
}

export async function concluirOP(op_id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ordens_producao')
    .update({ status: 'concluida' })
    .eq('id', op_id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/em-producao.ts
git commit -m "feat: add upsertStatusSetor and concluirOP server actions"
```

---

## Task 4: Query Layer

**Files:**
- Create: `lib/queries/em-producao.ts`

- [ ] **Step 1: Criar `lib/queries/em-producao.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { OPEmProducao, StatusSetorRow, ItemEnriquecido } from '@/types'

export async function getOPsEmProducao(): Promise<OPEmProducao[]> {
  const supabase = await createClient()

  // 1. OPs emitidas
  const { data: ops, error } = await supabase
    .from('ordens_producao')
    .select('id, numero, emitida_at')
    .eq('status', 'emitida')
    .order('emitida_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!ops || ops.length === 0) return []

  const opIds = ops.map(op => op.id)

  // 2. Itens das OPs
  const { data: itensRaw } = await supabase
    .from('ordens_producao_itens')
    .select('id, ordem_id, pelicula_id, mescla_id, quantidade')
    .in('ordem_id', opIds)

  const itens = itensRaw ?? []

  // 3. Nomes das películas
  const pelIds = [...new Set(itens.map((i: any) => i.pelicula_id).filter(Boolean))]
  const { data: pelRaw } = pelIds.length
    ? await supabase.from('peliculas').select('id, nome').in('id', pelIds)
    : { data: [] }
  const pelMap = new Map((pelRaw ?? []).map((p: any) => [p.id, p.nome as string]))

  // 4. Nomes das mesclas
  const mesclaIds = [...new Set(itens.map((i: any) => i.mescla_id).filter(Boolean))]
  const { data: mesclaRaw } = mesclaIds.length
    ? await supabase.from('mesclas').select('id, nome').in('id', mesclaIds)
    : { data: [] }
  const mesclaMap = new Map((mesclaRaw ?? []).map((m: any) => [m.id, m.nome as string]))

  // 5. Status de cada setor por OP
  const { data: statusRaw } = await supabase
    .from('status_setor')
    .select('*')
    .in('op_id', opIds)

  // Montar resultado
  return ops.map(op => ({
    id: op.id,
    numero: op.numero,
    emitida_at: op.emitida_at ?? op.id,
    itens: itens
      .filter((i: any) => i.ordem_id === op.id)
      .map((i: any): ItemEnriquecido => ({
        id: i.id,
        ordem_id: i.ordem_id,
        pelicula_id: i.pelicula_id ?? null,
        mescla_id: i.mescla_id ?? null,
        quantidade: i.quantidade,
        peliculas: i.pelicula_id ? { nome: pelMap.get(i.pelicula_id) ?? '' } : undefined,
        mesclas: i.mescla_id ? { nome: mesclaMap.get(i.mescla_id) ?? '' } : undefined,
      })),
    statusSetor: (statusRaw ?? []).filter((s: any) => s.op_id === op.id) as StatusSetorRow[],
  }))
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/em-producao.ts
git commit -m "feat: add getOPsEmProducao query"
```

---

## Task 5: SetorEditor Component

**Files:**
- Create: `components/em-producao/SetorEditor.tsx`

- [ ] **Step 1: Criar `components/em-producao/SetorEditor.tsx`**

```typescript
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

interface Props {
  opId: string
  setor: 'quimico' | 'maquina' | 'corte'
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
```

- [ ] **Step 2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add components/em-producao/SetorEditor.tsx
git commit -m "feat: add SetorEditor client component"
```

---

## Task 6: OPStatusCard Component

**Files:**
- Create: `components/em-producao/OPStatusCard.tsx`

- [ ] **Step 1: Criar `components/em-producao/OPStatusCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SetorEditor } from './SetorEditor'
import { concluirOP } from '@/lib/actions/em-producao'
import type { ItemEnriquecido, StatusSetorRow } from '@/types'

interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
}

const SETORES = [
  { key: 'quimico' as const, label: 'Químico', icon: '🧪' },
  { key: 'maquina' as const, label: 'Máquina', icon: '⚙️' },
  { key: 'corte' as const, label: 'Corte', icon: '✂️' },
]

function getOpcoes(
  setor: 'quimico' | 'maquina' | 'corte',
  itens: ItemEnriquecido[]
): { id: string; label: string }[] {
  if (setor === 'quimico') {
    return itens
      .filter(i => i.mescla_id && i.mesclas)
      .map(i => ({ id: i.id, label: i.mesclas!.nome }))
  }
  return itens
    .filter(i => i.pelicula_id && i.peliculas)
    .map(i => ({
      id: i.id,
      label:
        setor === 'maquina'
          ? `${i.peliculas!.nome} — ${i.quantidade}m`
          : i.peliculas!.nome,
    }))
}

export function OPStatusCard({ op, itens, statusSetor }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<'quimico' | 'maquina' | 'corte' | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [erroConclui, setErroConclui] = useState('')

  async function handleConcluir() {
    setConcluindo(true)
    setErroConclui('')
    try {
      await concluirOP(op.id)
      router.refresh()
    } catch (err: any) {
      setErroConclui(err.message ?? 'Erro ao concluir')
    } finally {
      setConcluindo(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-semibold">{op.numero}</span>
            <span className="text-xs text-muted-foreground ml-2">
              Emitida em{' '}
              {new Date(op.emitida_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs hover:bg-blue-100 shrink-0">
            emitida
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SETORES.map(({ key, label, icon }) => {
          const status = statusSetor.find(s => s.setor === key)
          const opcoes = getOpcoes(key, itens)
          const itemAtual = status ? opcoes.find(o => o.id === status.item_id) : undefined

          return (
            <div key={key} className="flex items-center gap-2 text-sm min-h-[28px]">
              <span className="w-20 text-muted-foreground font-medium shrink-0 text-xs">
                {icon} {label}
              </span>
              {editando === key ? (
                <SetorEditor
                  opId={op.id}
                  setor={key}
                  opcoes={opcoes}
                  itemAtualId={status?.item_id}
                  onCancelar={() => setEditando(null)}
                />
              ) : status && itemAtual ? (
                <>
                  <span className="flex-1 text-slate-800 text-xs">{itemAtual.label} ✓</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 shrink-0"
                    onClick={() => setEditando(key)}
                  >
                    ✏️ Editar
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-muted-foreground text-xs italic">
                    {opcoes.length === 0 ? 'Sem itens neste setor' : 'Não iniciado'}
                  </span>
                  {opcoes.length > 0 && (
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2 shrink-0"
                      onClick={() => setEditando(key)}
                    >
                      ▶ Iniciar
                    </Button>
                  )}
                </>
              )}
            </div>
          )
        })}

        <div className="pt-1 flex flex-col items-end gap-1">
          {erroConclui && (
            <p className="text-xs text-red-600 self-start">{erroConclui}</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-green-700 border-green-300 hover:bg-green-50"
            onClick={handleConcluir}
            disabled={concluindo}
          >
            {concluindo ? 'Concluindo...' : '✅ Marcar como Concluída'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add components/em-producao/OPStatusCard.tsx
git commit -m "feat: add OPStatusCard client component"
```

---

## Task 7: EmProducaoList + Page

**Files:**
- Create: `components/em-producao/EmProducaoList.tsx`
- Create: `app/(app)/em-producao/page.tsx`

- [ ] **Step 1: Criar `components/em-producao/EmProducaoList.tsx`**

```typescript
import type { OPEmProducao } from '@/types'
import { OPStatusCard } from './OPStatusCard'

interface Props {
  ops: OPEmProducao[]
}

export function EmProducaoList({ ops }: Props) {
  if (ops.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        Nenhuma OP emitida no momento.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {ops.map(op => (
        <OPStatusCard
          key={op.id}
          op={{ id: op.id, numero: op.numero, emitida_at: op.emitida_at }}
          itens={op.itens}
          statusSetor={op.statusSetor}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Criar `app/(app)/em-producao/page.tsx`**

```typescript
import { getOPsEmProducao } from '@/lib/queries/em-producao'
import { EmProducaoList } from '@/components/em-producao/EmProducaoList'

export default async function EmProducaoPage() {
  const ops = await getOPsEmProducao()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏭 Em Produção</h1>
        <p className="text-sm text-muted-foreground">
          Status em tempo real por setor — atualize ao recarregar a página
        </p>
      </div>
      <EmProducaoList ops={ops} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipagem e build**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/em-producao/EmProducaoList.tsx app/(app)/em-producao/page.tsx
git commit -m "feat: add EmProducaoList and /em-producao page"
```

---

## Task 8: Dashboard Card + Wiring

**Files:**
- Create: `components/dashboard/EmProducaoAgora.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Criar `components/dashboard/EmProducaoAgora.tsx`**

```typescript
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatusAtivo {
  op_id: string
  op_numero: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_label: string
}

interface Props {
  statuses: StatusAtivo[]
}

const SETOR_META: Record<string, { icon: string; label: string }> = {
  quimico: { icon: '🧪', label: 'Químico' },
  maquina: { icon: '⚙️', label: 'Máquina' },
  corte: { icon: '✂️', label: 'Corte' },
}

export function EmProducaoAgora({ statuses }: Props) {
  // Agrupar por OP
  const byOp = new Map<string, { op_id: string; op_numero: string; setores: StatusAtivo[] }>()
  for (const s of statuses) {
    if (!byOp.has(s.op_id)) byOp.set(s.op_id, { op_id: s.op_id, op_numero: s.op_numero, setores: [] })
    byOp.get(s.op_id)!.setores.push(s)
  }
  const ops = [...byOp.values()]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">🏭 Em produção agora</CardTitle>
          <Link href="/em-producao" className="text-xs text-blue-600 hover:underline">
            Ver tudo →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {ops.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum setor em produção no momento.
          </p>
        ) : (
          <div className="space-y-4">
            {ops.map(({ op_id, op_numero, setores }) => (
              <div key={op_id}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{op_numero}</p>
                <div className="space-y-1.5">
                  {(['quimico', 'maquina', 'corte'] as const).map(setor => {
                    const meta = SETOR_META[setor]
                    const s = setores.find(x => x.setor === setor)
                    return (
                      <div key={setor} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-muted-foreground shrink-0">
                          {meta.icon} {meta.label}
                        </span>
                        {s ? (
                          <span className="text-slate-800">{s.item_label}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Aguardando</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Modificar `app/(app)/dashboard/page.tsx`**

**2a. Adicionar import no topo do arquivo:**

```typescript
import { EmProducaoAgora } from '@/components/dashboard/EmProducaoAgora'
```

**2b. No `Promise.all` existente**, adicionar uma nova query para OPs emitidas com número. Localizar a linha que começa com `supabase.from('ordens_producao').select('id, emitida_at')` e adicionar **logo abaixo** no mesmo `Promise.all`:

```typescript
    // OPs emitidas com número (para card Em Produção)
    supabase
      .from('ordens_producao')
      .select('id, numero')
      .eq('status', 'emitida'),
```

E desestruturar no início do `Promise.all`:

```typescript
  const [
    { data: movsPfRaw },
    { data: movsPeliculaRaw },
    { data: opsAll },
    { data: opsRecentes },
    { data: opsEmitidas },
    { data: opsEmitidaNomes },   // ← novo
  ] = await Promise.all([
    // ... queries existentes ...
    supabase.from('ordens_producao').select('id, numero').eq('status', 'emitida'),  // ← novo
  ])
```

**2c. Após o bloco `// --- PF movements ---`**, adicionar o bloco de status_setor:

```typescript
  // --- Em Produção status ---
  const emProducaoOpIds = (opsEmitidaNomes ?? []).map((op: any) => op.id)
  const { data: statusSetorRaw } = emProducaoOpIds.length
    ? await supabase.from('status_setor').select('*').in('op_id', emProducaoOpIds)
    : { data: [] }

  const emProdItemIds = [...new Set((statusSetorRaw ?? []).map((s: any) => s.item_id).filter(Boolean))]
  const { data: emProdItens } = emProdItemIds.length
    ? await supabase
        .from('ordens_producao_itens')
        .select('id, pelicula_id, mescla_id, quantidade')
        .in('id', emProdItemIds)
    : { data: [] }

  const emProdPelIds = [...new Set((emProdItens ?? []).map((i: any) => i.pelicula_id).filter(Boolean))]
  const { data: emProdPelNomes } = emProdPelIds.length
    ? await supabase.from('peliculas').select('id, nome').in('id', emProdPelIds)
    : { data: [] }
  const emProdPelMap = new Map((emProdPelNomes ?? []).map((p: any) => [p.id, p.nome as string]))

  const emProdMesclaIds = [...new Set((emProdItens ?? []).map((i: any) => i.mescla_id).filter(Boolean))]
  const { data: emProdMesclaRaw } = emProdMesclaIds.length
    ? await supabase.from('mesclas').select('id, nome').in('id', emProdMesclaIds)
    : { data: [] }
  const emProdMesclaMap = new Map((emProdMesclaRaw ?? []).map((m: any) => [m.id, m.nome as string]))

  const emProdItemLabelMap = new Map(
    (emProdItens ?? []).map((i: any) => [
      i.id as string,
      (i.pelicula_id ? emProdPelMap.get(i.pelicula_id) : emProdMesclaMap.get(i.mescla_id)) ?? '',
    ])
  )
  const emProdNomeMap = new Map((opsEmitidaNomes ?? []).map((op: any) => [op.id as string, op.numero as string]))

  const emProducaoStatuses = (statusSetorRaw ?? []).map((s: any) => ({
    op_id: s.op_id as string,
    op_numero: emProdNomeMap.get(s.op_id) ?? '',
    setor: s.setor as 'quimico' | 'maquina' | 'corte',
    item_label: emProdItemLabelMap.get(s.item_id) ?? '',
  }))
```

**2d. No JSX**, adicionar `<EmProducaoAgora>` entre `<StockAlerts>` e o `<div className="grid">`:

```tsx
      <StockAlerts materias={materias} peliculas={peliculas} />

      <EmProducaoAgora statuses={emProducaoStatuses} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

- [ ] **Step 3: Verificar tipagem**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/EmProducaoAgora.tsx app/(app)/dashboard/page.tsx
git commit -m "feat: add EmProducaoAgora dashboard card and wire into dashboard page"
```

---

## Task 9: Navigation + Build + Deploy

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/BottomNav.tsx`

- [ ] **Step 1: Atualizar `components/layout/Sidebar.tsx`**

Substituir o array `navItems` por (adicionando `Em Produção` entre `ordens-producao` e `corte`):

```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/materias-primas', label: 'Matéria-Prima', icon: '🧪' },
  { href: '/peliculas', label: 'Películas', icon: '🎞️' },
  { href: '/ordens-producao', label: 'Ordens de Produção', icon: '📋' },
  { href: '/em-producao', label: 'Em Produção', icon: '🏭' },
  { href: '/corte', label: 'Corte', icon: '✂️' },
  { href: '/produtos-finalizados', label: 'Prod. Finalizado', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]
```

- [ ] **Step 2: Atualizar `components/layout/BottomNav.tsx`**

Substituir o array `navItems` por (adicionando `Em Produção` entre `ordens-producao` e `corte`):

```typescript
const navItems = [
  { href: '/dashboard', label: 'Início', icon: '📊' },
  { href: '/materias-primas', label: 'MP', icon: '🧪' },
  { href: '/peliculas', label: 'Pelíc.', icon: '🎞️' },
  { href: '/ordens-producao', label: 'OPs', icon: '📋' },
  { href: '/em-producao', label: 'Produção', icon: '🏭' },
  { href: '/corte', label: 'Corte', icon: '✂️' },
  { href: '/produtos-finalizados', label: 'PF', icon: '📦' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
  { href: '/configuracoes', label: 'Config', icon: '⚙️' },
]
```

- [ ] **Step 3: Commit navigation**

```bash
git add components/layout/Sidebar.tsx components/layout/BottomNav.tsx
git commit -m "feat: add Em Producao nav item to sidebar and bottom nav"
```

- [ ] **Step 4: Build de produção**

```bash
npm run build
```

Expected: `✓ Compiled successfully` — zero erros. Se houver erros de tipo ou build, corrigi-los antes de continuar.

- [ ] **Step 5: Deploy**

```bash
vercel --prod
```

Expected: URL de produção exibida. Verificar no browser:
- `/em-producao` carrega sem erros
- Dashboard mostra card "Em produção agora"
- Sidebar e BottomNav têm o item "Em Produção"
- Clicar "▶ Iniciar" em uma OP emitida, selecionar item e salvar — status aparece
- Clicar "✅ Marcar como Concluída" — OP desaparece da lista
