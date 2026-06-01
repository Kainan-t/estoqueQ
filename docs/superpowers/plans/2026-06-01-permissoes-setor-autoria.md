# Permissões por Setor + Autoria Inline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir edição no módulo "Em Produção" ao setor do operador logado, exibir autoria inline em cada status, e bloquear "Marcar como Concluída" para não-admins.

**Architecture:** Nova coluna `setor` em `profiles` define o setor do operador. A página `/em-producao` lê o perfil do usuário logado e repassa `meuCargo`/`meuSetor` para os cards. `OPStatusCard` usa esses valores para mostrar/ocultar botões e exibir "por [Nome] • [data hora]". As server actions revalidam server-side. Configurações ganha seletor de setor por operador.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase SSR + Server Actions, shadcn/ui, Tailwind CSS.

---

## File Map

| Arquivo | Ação |
|---|---|
| SQL (Supabase) | Adicionar coluna `setor` em `profiles` |
| `types/index.ts` | Adicionar `Setor`, atualizar `Profile` e `StatusSetorRow` |
| `lib/queries/em-producao.ts` | Enriquecer `StatusSetorRow` com `usuario_nome` |
| `lib/actions/em-producao.ts` | Validar setor/cargo antes de cada ação |
| `app/(app)/em-producao/page.tsx` | Buscar perfil do usuário logado, passar para EmProducaoList |
| `components/em-producao/EmProducaoList.tsx` | Aceitar e repassar `meuCargo`/`meuSetor` |
| `components/em-producao/OPStatusCard.tsx` | Gates de botão + display de autoria |
| `app/(app)/configuracoes/page.tsx` | Incluir `setor` na query de usuários |
| `app/(app)/configuracoes/ConfiguracoesClient.tsx` | Seletor de setor por operador |

---

## Task 1: SQL Migration (manual)

**Files:** Supabase SQL Editor (não é um arquivo no repo)

> Esta task é executada manualmente no painel do Supabase, não via código.

- [ ] **Step 1: Executar a migration no Supabase SQL Editor**

Abrir Supabase → SQL Editor → New query → colar e executar:

```sql
ALTER TABLE profiles
  ADD COLUMN setor text
  CHECK (setor IN ('quimico', 'maquina', 'corte'));
```

Resultado esperado: `ALTER TABLE` sem erro. A coluna é nullable por padrão — todos os perfis existentes ficam com `NULL`.

- [ ] **Step 2: Verificar**

Executar no SQL Editor:

```sql
SELECT id, nome, cargo, setor FROM profiles LIMIT 5;
```

Resultado esperado: coluna `setor` aparece com valor `NULL` para todos os registros existentes.

---

## Task 2: Types Update

**Files:**
- Modify: `types/index.ts`

**Contexto:** O arquivo `types/index.ts` contém todos os tipos compartilhados. `Profile` atualmente tem apenas `id, nome, cargo, created_at`. `StatusSetorRow` usa a literal `'quimico' | 'maquina' | 'corte'` inline para `setor`. Vamos extrair um tipo nomeado `Setor` e atualizar as duas interfaces.

- [ ] **Step 1: Adicionar tipo `Setor` e atualizar `Profile`**

Em `types/index.ts`, localizar a linha:

```ts
export type Cargo = 'admin' | 'operador'
```

Adicionar logo abaixo:

```ts
export type Setor = 'quimico' | 'maquina' | 'corte'
```

Depois localizar a interface `Profile`:

```ts
export interface Profile {
  id: string
  nome: string
  cargo: Cargo
  created_at: string
}
```

Substituir por:

```ts
export interface Profile {
  id: string
  nome: string
  cargo: Cargo
  setor: Setor | null
  created_at: string
}
```

- [ ] **Step 2: Atualizar `StatusSetorRow`**

Localizar:

```ts
export interface StatusSetorRow {
  id: string
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_id: string
  updated_at: string
  usuario_id: string | null
}
```

Substituir por:

```ts
export interface StatusSetorRow {
  id: string
  op_id: string
  setor: Setor
  item_id: string
  updated_at: string
  usuario_id: string | null
  usuario_nome: string | null
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 erros (ou apenas erros nos arquivos que ainda usam a literal string inline para setor — serão corrigidos nas próximas tasks).

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Setor type, update Profile and StatusSetorRow"
```

---

## Task 3: Query Layer — Enriquecer com `usuario_nome`

**Files:**
- Modify: `lib/queries/em-producao.ts`

**Contexto:** A função `getOPsEmProducao` já busca `status_setor.*` (que inclui `usuario_id`). Precisamos buscar os nomes dos perfis correspondentes e adicioná-los a cada `StatusSetorRow`. O padrão do projeto é fazer queries separadas com `.in()` — nunca PostgREST joins.

- [ ] **Step 1: Adicionar busca de perfis após o fetch de `status_setor`**

Em `lib/queries/em-producao.ts`, localizar o comentário `// Montar resultado` (linha 46). Inserir antes dele:

```ts
  // 6. Nomes dos autores dos status_setor
  const usuarioIds = [...new Set(
    (statusRaw ?? []).map((s: any) => s.usuario_id).filter(Boolean)
  )] as string[]
  const { data: perfisRaw } = usuarioIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', usuarioIds)
    : { data: [] }
  const perfisMap = new Map((perfisRaw ?? []).map((p: any) => [p.id, p.nome as string]))
```

- [ ] **Step 2: Enriquecer `statusSetor` no resultado**

Localizar (dentro do `return ops.map(...)`):

```ts
    statusSetor: (statusRaw ?? []).filter((s: any) => s.op_id === op.id) as StatusSetorRow[],
```

Substituir por:

```ts
    statusSetor: (statusRaw ?? [])
      .filter((s: any) => s.op_id === op.id)
      .map((s: any): StatusSetorRow => ({
        id: s.id,
        op_id: s.op_id,
        setor: s.setor,
        item_id: s.item_id,
        updated_at: s.updated_at,
        usuario_id: s.usuario_id ?? null,
        usuario_nome: s.usuario_id ? (perfisMap.get(s.usuario_id) ?? null) : null,
      })),
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/em-producao.ts
git commit -m "feat: enrich status_setor rows with usuario_nome"
```

---

## Task 4: Server Actions — Validação de Setor e Cargo

**Files:**
- Modify: `lib/actions/em-producao.ts`

**Contexto:** Atualmente `upsertStatusSetor` não valida o setor do usuário e `concluirOP` não valida se é admin. Vamos adicionar essas validações. O arquivo completo fica assim:

- [ ] **Step 1: Reescrever `lib/actions/em-producao.ts`**

Substituir o conteúdo inteiro do arquivo por:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Setor } from '@/types'

export async function upsertStatusSetor(data: {
  op_id: string
  setor: Setor
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('cargo, setor')
    .eq('id', user.id)
    .single()

  if (profile?.cargo !== 'admin' && profile?.setor !== data.setor) {
    throw new Error('Sem permissão para editar este setor')
  }

  const { error } = await supabase
    .from('status_setor')
    .upsert(
      {
        op_id: data.op_id,
        setor: data.setor,
        item_id: data.item_id,
        updated_at: new Date().toISOString(),
        usuario_id: user.id,
      },
      { onConflict: 'op_id,setor' }
    )
  if (error) throw new Error(error.message)
}

export async function concluirOP(op_id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (profile?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem concluir OPs')
  }

  const { error } = await supabase
    .from('ordens_producao')
    .update({ status: 'concluida' })
    .eq('id', op_id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/em-producao.ts
git commit -m "feat: add sector and admin validation to em-producao server actions"
```

---

## Task 5: Página `/em-producao` + `EmProducaoList`

**Files:**
- Modify: `app/(app)/em-producao/page.tsx`
- Modify: `components/em-producao/EmProducaoList.tsx`

**Contexto:** A página precisa buscar o perfil do usuário logado (`cargo` e `setor`) e repassar para `EmProducaoList`, que repassa para cada `OPStatusCard`. Atualmente nem a página nem o componente fazem isso.

- [ ] **Step 1: Atualizar `app/(app)/em-producao/page.tsx`**

Substituir o conteúdo inteiro por:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOPsEmProducao } from '@/lib/queries/em-producao'
import { EmProducaoList } from '@/components/em-producao/EmProducaoList'
import type { Cargo, Setor } from '@/types'

export default async function EmProducaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ops, { data: perfil }] = await Promise.all([
    getOPsEmProducao(),
    supabase.from('profiles').select('cargo, setor').eq('id', user.id).single(),
  ])

  const meuCargo: Cargo = perfil?.cargo ?? 'operador'
  const meuSetor: Setor | null = perfil?.setor ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏭 Em Produção</h1>
        <p className="text-sm text-muted-foreground">
          Status em tempo real por setor — atualize ao recarregar a página
        </p>
      </div>
      <EmProducaoList ops={ops} meuCargo={meuCargo} meuSetor={meuSetor} />
    </div>
  )
}
```

- [ ] **Step 2: Atualizar `components/em-producao/EmProducaoList.tsx`**

Substituir o conteúdo inteiro por:

```tsx
import type { OPEmProducao, Cargo, Setor } from '@/types'
import { OPStatusCard } from './OPStatusCard'

interface Props {
  ops: OPEmProducao[]
  meuCargo: Cargo
  meuSetor: Setor | null
}

export function EmProducaoList({ ops, meuCargo, meuSetor }: Props) {
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
          meuCargo={meuCargo}
          meuSetor={meuSetor}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: erros em `OPStatusCard` (ainda não aceita as novas props) — isso é esperado e será corrigido na próxima task.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/em-producao/page.tsx" components/em-producao/EmProducaoList.tsx
git commit -m "feat: pass meuCargo and meuSetor from page to EmProducaoList"
```

---

## Task 6: `OPStatusCard` — Gates de Permissão + Autoria

**Files:**
- Modify: `components/em-producao/OPStatusCard.tsx`

**Contexto:** Este componente exibe os 3 setores de uma OP. Precisa receber `meuCargo` e `meuSetor`, usar essas informações para mostrar/ocultar botões de ação, e exibir "por [Nome] • [data hora]" abaixo de cada setor com status.

- [ ] **Step 1: Reescrever `components/em-producao/OPStatusCard.tsx`**

Substituir o conteúdo inteiro por:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SetorEditor } from './SetorEditor'
import { concluirOP } from '@/lib/actions/em-producao'
import type { ItemEnriquecido, StatusSetorRow, Cargo, Setor } from '@/types'

interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
  meuCargo: Cargo
  meuSetor: Setor | null
}

const SETORES = [
  { key: 'quimico' as const, label: 'Químico', icon: '🧪' },
  { key: 'maquina' as const, label: 'Máquina', icon: '⚙️' },
  { key: 'corte' as const, label: 'Corte', icon: '✂️' },
]

function getOpcoes(
  setor: Setor,
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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export function OPStatusCard({ op, itens, statusSetor, meuCargo, meuSetor }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<Setor | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [erroConclui, setErroConclui] = useState('')

  const canEditSetor = (key: Setor) =>
    meuCargo === 'admin' || meuSetor === key

  const canConcluir = meuCargo === 'admin'

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
          const podeEditar = canEditSetor(key)

          return (
            <div key={key} className="text-sm min-h-[28px]">
              <div className="flex items-center gap-2">
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
                    {podeEditar && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 shrink-0"
                        onClick={() => setEditando(key)}
                      >
                        ✏️ Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-muted-foreground text-xs italic">
                      {opcoes.length === 0 ? 'Sem itens neste setor' : 'Não iniciado'}
                    </span>
                    {opcoes.length > 0 && podeEditar && (
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
              {status && itemAtual && status.usuario_nome && (
                <p className="text-[10px] text-muted-foreground ml-[88px] mt-0.5">
                  por {status.usuario_nome} • {formatDateTime(status.updated_at)}
                </p>
              )}
            </div>
          )
        })}

        {canConcluir && (
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
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add components/em-producao/OPStatusCard.tsx
git commit -m "feat: add sector permission gates and inline authorship to OPStatusCard"
```

---

## Task 7: Configurações — Seletor de Setor

**Files:**
- Modify: `app/(app)/configuracoes/page.tsx`
- Modify: `app/(app)/configuracoes/ConfiguracoesClient.tsx`

**Contexto:** A página já busca usuários e exibe cargo. Precisamos incluir `setor` na query e adicionar um dropdown de setor por operador. Admins não têm setor — o dropdown só aparece para `cargo === 'operador'`.

- [ ] **Step 1: Atualizar query de usuários em `configuracoes/page.tsx`**

Localizar:

```ts
    supabase.from('profiles').select('id, nome, cargo').order('nome'),
```

Substituir por:

```ts
    supabase.from('profiles').select('id, nome, cargo, setor').order('nome'),
```

- [ ] **Step 2: Atualizar imports em `ConfiguracoesClient.tsx`**

Localizar a linha de import de UI components:

```ts
import { Badge } from '@/components/ui/badge'
```

Adicionar logo abaixo:

```ts
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
```

Localizar o import de types:

```ts
import type { MateriaPrima, ConfiguracaoQualidade, Profile, Pelicula, Mescla } from '@/types'
```

Substituir por:

```ts
import type { MateriaPrima, ConfiguracaoQualidade, Profile, Pelicula, Mescla, Setor } from '@/types'
```

- [ ] **Step 3: Atualizar a interface Props em `ConfiguracoesClient.tsx`**

Localizar:

```ts
  usuarios: Pick<Profile, 'id' | 'nome' | 'cargo'>[]
```

Substituir por:

```ts
  usuarios: Pick<Profile, 'id' | 'nome' | 'cargo' | 'setor'>[]
```

- [ ] **Step 4: Adicionar estado `savingSetor` em `ConfiguracoesClient.tsx`**

Localizar:

```ts
  const [savingCargo, setSavingCargo] = useState<string | null>(null)
```

Adicionar logo abaixo:

```ts
  const [savingSetor, setSavingSetor] = useState<string | null>(null)
```

- [ ] **Step 5: Adicionar função `alterarSetor` em `ConfiguracoesClient.tsx`**

Localizar a função `alterarCargo` (começa na linha ~73). Adicionar logo após o fechamento dela (`}`):

```ts
  async function alterarSetor(id: string, setor: Setor | null) {
    setSavingSetor(id)
    setSaveError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ setor: setor || null })
        .eq('id', id)
      if (error) { setSaveError('Erro ao alterar setor.'); return }
      router.refresh()
    } finally {
      setSavingSetor(null)
    }
  }
```

- [ ] **Step 6: Adicionar seletor de setor na lista de usuários**

Localizar dentro do `{usuarios.map(u => (...))}` a div com os botões de cargo:

```tsx
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
```

Substituir por:

```tsx
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {u.cargo === 'operador' && (
                    <Select
                      value={u.setor ?? ''}
                      onValueChange={(val) => alterarSetor(u.id, (val || null) as Setor | null)}
                      disabled={savingSetor === u.id}
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <SelectValue placeholder="— sem setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— sem setor</SelectItem>
                        <SelectItem value="quimico">🧪 Químico</SelectItem>
                        <SelectItem value="maquina">⚙️ Máquina</SelectItem>
                        <SelectItem value="corte">✂️ Corte</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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
```

- [ ] **Step 7: Verificar tipos**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 erros.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/configuracoes/page.tsx" "app/(app)/configuracoes/ConfiguracoesClient.tsx"
git commit -m "feat: add sector selector to user management in Configuracoes"
```

---

## Task 8: Build + Deploy

**Files:** Nenhum arquivo novo

- [ ] **Step 1: Build de produção local**

```bash
npm run build
```

Resultado esperado: `✓ Compiled successfully` sem erros de tipo ou build. Ignorar warnings de ESLint se presentes.

- [ ] **Step 2: Deploy para Vercel**

```bash
git push origin master
```

Aguardar o deploy completar no painel da Vercel.

- [ ] **Step 3: Smoke test em produção**

1. Logar como **admin** → acessar `/configuracoes` → verificar dropdown de setor por operador
2. Atribuir setor `🧪 Químico` para um operador de teste
3. Logar como esse operador → acessar `/em-producao` → verificar que apenas os botões do Químico estão visíveis
4. Clicar ▶ Iniciar no Químico → selecionar item → salvar → verificar "por [Nome] • [data hora]" aparece
5. Verificar que "✅ Marcar como Concluída" **não aparece** para o operador
6. Logar como admin → verificar que todos os botões + "Marcar como Concluída" aparecem
