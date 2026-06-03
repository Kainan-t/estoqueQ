# Lotes de Produção de Películas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o operador da Máquina registre lotes de identificação (com metragem e autoria) para cada película produzida numa OP, com número auto-gerado editável, visível no card de Em Produção.

**Architecture:** Nova tabela `lotes_producao` (1 OP-item → N lotes) e coluna `peliculas.codigo`. Lógica de número de lote isolada em funções puras testáveis (`lib/lotes.ts`). Server actions validam permissão (Máquina/admin). O card da OP computa o número sugerido no cliente a partir dos lotes já carregados — sem roundtrip extra. Padrão de autoria reaproveita o enriquecimento `usuario_nome` existente.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Supabase SSR, TypeScript, Jest (funções puras), shadcn/ui.

> **IMPORTANTE (AGENTS.md):** Esta versão do Next.js tem breaking changes. Antes de escrever código de framework, consulte os guias em `node_modules/next/dist/docs/`.

> **Padrões do repositório:**
> - Sempre `const supabase = await createClient()` (nunca sem await).
> - Em Produção **não usa joins do PostREST** — enriquecimento via `.in()` separado + `Map`.
> - Após Server Action no cliente: `router.refresh()`.
> - Permissão de setor: `cargo === 'admin' || setor === <setor>`, validada **no servidor** e refletida na UI.
> - Testes só existem para funções puras (`__tests__/*.test.ts`); UI/queries/actions são verificadas via `npx next build`. Rodar testes: `npx jest`.

---

### Task 1: Migration SQL (manual)

**Files:**
- Nenhum arquivo no repositório. A migration é aplicada **manualmente** por você no painel do Supabase (SQL Editor), seguindo o padrão das features anteriores.

- [ ] **Step 1: Aplicar a migration no Supabase**

Abra o **SQL Editor** do projeto no Supabase e execute exatamente este script:

```sql
-- 1. Coluna de código curto na película (opcional)
alter table peliculas add column if not exists codigo text;

-- 2. Tabela de lotes de produção
create table if not exists lotes_producao (
  id uuid primary key default gen_random_uuid(),
  op_id uuid not null references ordens_producao(id) on delete cascade,
  item_id uuid not null references ordens_producao_itens(id) on delete cascade,
  pelicula_id uuid not null references peliculas(id),
  numero text not null unique,
  metragem numeric not null,
  usuario_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_lotes_producao_op_id on lotes_producao(op_id);
create index if not exists idx_lotes_producao_item_id on lotes_producao(item_id);
```

- [ ] **Step 2: Verificar que aplicou**

Ainda no SQL Editor, rode:

```sql
select column_name from information_schema.columns where table_name = 'peliculas' and column_name = 'codigo';
select column_name from information_schema.columns where table_name = 'lotes_producao' order by ordinal_position;
```

Esperado: a primeira query retorna 1 linha (`codigo`). A segunda retorna 8 linhas: `id, op_id, item_id, pelicula_id, numero, metragem, usuario_id, created_at`.

- [ ] **Step 3: Confirmar conclusão**

Não há commit nesta task (mudança só no banco). Marque como concluída quando as duas queries de verificação retornarem o esperado.

---

### Task 2: Funções puras de lote + testes (TDD)

Lógica de geração de número e slug isolada e testável. Sem dependências de DB.

**Files:**
- Create: `lib/lotes.ts`
- Test: `__tests__/lotes.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Crie `__tests__/lotes.test.ts`:

```typescript
import { slugPelicula, codigoLote, proximoNumeroLote } from '@/lib/lotes'

describe('slugPelicula', () => {
  it('coloca em maiúsculas e remove espaços', () => {
    expect(slugPelicula('Fume 35')).toBe('FUME35')
  })

  it('remove acentos', () => {
    expect(slugPelicula('Fumê')).toBe('FUME')
  })

  it('remove caracteres não alfanuméricos', () => {
    expect(slugPelicula('PS-4 Clear!')).toBe('PS4CLEAR')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(slugPelicula('')).toBe('')
  })
})

describe('codigoLote', () => {
  it('usa o código quando preenchido', () => {
    expect(codigoLote('FUME', 'Fumê 35')).toBe('FUME')
  })

  it('faz slug do código preenchido', () => {
    expect(codigoLote('fu-me', 'Qualquer')).toBe('FUME')
  })

  it('usa o slug do nome quando código é null', () => {
    expect(codigoLote(null, 'Fumê 35')).toBe('FUME35')
  })

  it('usa o slug do nome quando código é vazio/espacos', () => {
    expect(codigoLote('   ', 'G5')).toBe('G5')
  })
})

describe('proximoNumeroLote', () => {
  it('começa em 01 quando não há lotes', () => {
    expect(proximoNumeroLote('0042', 'FUME', [])).toBe('0042-FUME-01')
  })

  it('usa max sufixo + 1', () => {
    const existentes = ['0042-FUME-01', '0042-FUME-02']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-03')
  })

  it('ignora lotes de outro prefixo', () => {
    const existentes = ['0042-G5-01', '0042-G5-02']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-01')
  })

  it('preenche o gap usando max+1 (não contagem)', () => {
    const existentes = ['0042-FUME-01', '0042-FUME-03']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-04')
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `npx jest lotes`
Esperado: FAIL — `Cannot find module '@/lib/lotes'`.

- [ ] **Step 3: Implementar as funções puras**

Crie `lib/lotes.ts`:

```typescript
// Normaliza um texto para uso em código de lote:
// maiúsculas, sem acentos, somente A-Z e 0-9.
export function slugPelicula(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // remove marcas de acento combinantes (após NFD)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

// Código da película para o lote: usa `codigo` se preenchido, senão o nome.
// Em ambos os casos passa pelo slug para garantir formato consistente.
export function codigoLote(codigo: string | null, nome: string): string {
  const c = (codigo ?? '').trim()
  return c ? slugPelicula(c) : slugPelicula(nome)
}

// Próximo número de lote no formato {numeroOp}-{codigo}-{NN}.
// Usa o maior sufixo existente + 1 (não a contagem), evitando colisão
// quando um lote do meio é apagado. Começa em 01.
export function proximoNumeroLote(
  numeroOp: string,
  codigo: string,
  numerosExistentes: string[]
): string {
  const prefixo = `${numeroOp}-${codigo}-`
  let max = 0
  for (const num of numerosExistentes) {
    if (num.startsWith(prefixo)) {
      const sufixo = num.slice(prefixo.length)
      const n = parseInt(sufixo, 10)
      if (!isNaN(n) && n > max) max = n
    }
  }
  return `${prefixo}${String(max + 1).padStart(2, '0')}`
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `npx jest lotes`
Esperado: PASS — todos os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add lib/lotes.ts __tests__/lotes.test.ts
git commit -m "feat: add pure lote number generation helpers with tests"
```

---

### Task 3: Tipos

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Adicionar `codigo` à interface `Pelicula`**

Em `types/index.ts`, na interface `Pelicula` (por volta da linha 95), adicione o campo `codigo` logo após `nome`:

```typescript
export interface Pelicula {
  id: string
  nome: string
  codigo: string | null
  largura: string
  tonalidade: string
  espessura: string
  protecao_uva: string
  protecao_uvb: string
  estoque_minimo: number
  created_at: string
}
```

- [ ] **Step 2: Enriquecer `ItemEnriquecido.peliculas` com `codigo`**

Na interface `ItemEnriquecido` (por volta da linha 137), troque o tipo de `peliculas`:

```typescript
export interface ItemEnriquecido {
  id: string
  ordem_id: string
  pelicula_id: string | null
  mescla_id: string | null
  quantidade: number
  peliculas?: { nome: string; codigo: string | null }
  mesclas?: { nome: string }
}
```

- [ ] **Step 3: Adicionar a interface `LoteProducao` e o campo `lotes` em `OPEmProducao`**

Logo **acima** da interface `OPEmProducao` (por volta da linha 147), adicione:

```typescript
export interface LoteProducao {
  id: string
  op_id: string
  item_id: string
  pelicula_id: string
  numero: string
  metragem: number
  usuario_id: string | null
  usuario_nome: string | null
  created_at: string
}
```

E na interface `OPEmProducao`, adicione `lotes`:

```typescript
export interface OPEmProducao {
  id: string
  numero: string
  emitida_at: string
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
  lotes: LoteProducao[]
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: pode haver erros em `lib/queries/em-producao.ts` (porque ainda não retorna `lotes` nem `codigo`). Isso é esperado — será resolvido na Task 4. Confirme que os **únicos** erros são sobre `lotes` faltando no retorno de `getOPsEmProducao` e/ou `codigo` em `peliculas`. Se houver erros em outros arquivos, investigue.

- [ ] **Step 5: Commit**

```bash
git add types/index.ts
git commit -m "feat: add LoteProducao type, pelicula codigo and OP lotes"
```

---

### Task 4: Query layer — buscar e enriquecer lotes

**Files:**
- Modify: `lib/queries/em-producao.ts`

- [ ] **Step 1: Incluir `codigo` na busca de películas**

Em `lib/queries/em-producao.ts`, no passo 3 (nomes das películas), troque o `select` e o `pelMap` para carregar também `codigo`:

```typescript
  // 3. Nomes e códigos das películas
  const pelIds = [...new Set(itens.map((i: any) => i.pelicula_id).filter(Boolean))]
  const { data: pelRaw } = pelIds.length
    ? await supabase.from('peliculas').select('id, nome, codigo').in('id', pelIds)
    : { data: [] }
  const pelMap = new Map(
    (pelRaw ?? []).map((p: any) => [p.id, { nome: p.nome as string, codigo: (p.codigo ?? null) as string | null }])
  )
```

- [ ] **Step 2: Buscar os lotes e incluir seus autores no `perfisMap`**

Em `em-producao.ts`, localize o passo 6 atual (montagem de `usuarioIds`, `perfisRaw`, `perfisMap`). **Substitua esse bloco inteiro** pelo bloco abaixo, que primeiro busca os lotes (fetch único, `lotesRaw`) e depois monta `usuarioIds` a partir dos autores de `status_setor` **e** dos lotes:

```typescript
  // 6. Lotes de produção das OPs
  const { data: lotesRaw } = await supabase
    .from('lotes_producao')
    .select('id, op_id, item_id, pelicula_id, numero, metragem, usuario_id, created_at')
    .in('op_id', opIds)

  // 7. Nomes dos autores (status_setor + lotes)
  const usuarioIds = [...new Set([
    ...(statusRaw ?? []).map((s: any) => s.usuario_id),
    ...(lotesRaw ?? []).map((l: any) => l.usuario_id),
  ].filter(Boolean))] as string[]
  const { data: perfisRaw } = usuarioIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', usuarioIds)
    : { data: [] }
  const perfisMap = new Map((perfisRaw ?? []).map((p: any) => [p.id, p.nome as string]))
```

Resultado esperado: existe **um único** `await supabase.from('lotes_producao')` no arquivo, nomeado `lotesRaw`.

- [ ] **Step 3: (sem ação separada)**

Este passo foi consolidado no Step 2. Prossiga para o Step 4.

- [ ] **Step 4: Ajustar o item map para incluir `codigo`**

No bloco "Montar resultado", dentro de `itens.filter(...).map(...)`, troque a linha de `peliculas`:

```typescript
        peliculas: i.pelicula_id
          ? {
              nome: pelMap.get(i.pelicula_id)?.nome ?? '',
              codigo: pelMap.get(i.pelicula_id)?.codigo ?? null,
            }
          : undefined,
```

- [ ] **Step 5: Adicionar `lotes` ao retorno de cada OP**

Ainda em `ops.map(op => ({ ... }))`, após a propriedade `statusSetor: ...`, adicione:

```typescript
    lotes: (lotesRaw ?? [])
      .filter((l: any) => l.op_id === op.id)
      .map((l: any): LoteProducao => ({
        id: l.id,
        op_id: l.op_id,
        item_id: l.item_id,
        pelicula_id: l.pelicula_id,
        numero: l.numero,
        metragem: Number(l.metragem),
        usuario_id: l.usuario_id ?? null,
        usuario_nome: l.usuario_id ? (perfisMap.get(l.usuario_id) ?? null) : null,
        created_at: l.created_at,
      })),
```

- [ ] **Step 6: Atualizar o import de tipos**

No topo do arquivo, adicione `LoteProducao` ao import:

```typescript
import type { OPEmProducao, StatusSetorRow, ItemEnriquecido, LoteProducao } from '@/types'
```

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: PASS, sem erros.

- [ ] **Step 8: Commit**

```bash
git add lib/queries/em-producao.ts
git commit -m "feat: fetch and enrich production lotes in em-producao query"
```

---

### Task 5: Server actions — criar/atualizar/excluir lote

**Files:**
- Modify: `lib/actions/em-producao.ts`

- [ ] **Step 1: Adicionar helper de permissão Máquina/admin**

Em `lib/actions/em-producao.ts`, **abaixo** dos imports existentes (mantenha `import type { Setor } from '@/types'`), adicione um helper privado reutilizável:

```typescript
async function exigirMaquinaOuAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cargo, setor')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil de usuário não encontrado')
  if (profile.cargo !== 'admin' && profile.setor !== 'maquina') {
    throw new Error('Sem permissão para registrar lotes')
  }
  return { supabase, user }
}
```

- [ ] **Step 2: Adicionar `criarLote`**

No fim do arquivo, adicione:

```typescript
export async function criarLote(data: {
  op_id: string
  item_id: string
  numero: string
  metragem: number
}): Promise<void> {
  const { supabase, user } = await exigirMaquinaOuAdmin()

  const numero = data.numero.trim()
  if (!numero) throw new Error('Número do lote é obrigatório')
  if (!(data.metragem > 0)) throw new Error('Metragem deve ser maior que zero')

  const { data: item, error: itemError } = await supabase
    .from('ordens_producao_itens')
    .select('pelicula_id')
    .eq('id', data.item_id)
    .single()
  if (itemError || !item || !item.pelicula_id) {
    throw new Error('Item de película não encontrado')
  }

  const { error } = await supabase.from('lotes_producao').insert({
    op_id: data.op_id,
    item_id: data.item_id,
    pelicula_id: item.pelicula_id,
    numero,
    metragem: data.metragem,
    usuario_id: user.id,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Número de lote já existe')
    throw new Error(error.message)
  }
}
```

- [ ] **Step 3: Adicionar `atualizarLote`**

Em seguida, adicione:

```typescript
export async function atualizarLote(data: {
  id: string
  numero: string
  metragem: number
}): Promise<void> {
  const { supabase } = await exigirMaquinaOuAdmin()

  const numero = data.numero.trim()
  if (!numero) throw new Error('Número do lote é obrigatório')
  if (!(data.metragem > 0)) throw new Error('Metragem deve ser maior que zero')

  const { error } = await supabase
    .from('lotes_producao')
    .update({ numero, metragem: data.metragem })
    .eq('id', data.id)
  if (error) {
    if (error.code === '23505') throw new Error('Número de lote já existe')
    throw new Error(error.message)
  }
}
```

- [ ] **Step 4: Adicionar `excluirLote`**

Em seguida, adicione:

```typescript
export async function excluirLote(id: string): Promise<void> {
  const { supabase } = await exigirMaquinaOuAdmin()
  const { error } = await supabase.from('lotes_producao').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: PASS, sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/em-producao.ts
git commit -m "feat: add criarLote/atualizarLote/excluirLote server actions"
```

---

### Task 6: Componente LoteEditor

Formulário inline para criar/editar um lote. Espelha o padrão de `SetorEditor`.

**Files:**
- Create: `components/em-producao/LoteEditor.tsx`

- [ ] **Step 1: Criar o componente**

Crie `components/em-producao/LoteEditor.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarLote, atualizarLote } from '@/lib/actions/em-producao'

interface Props {
  opId: string
  itemId: string
  loteId?: string          // presente = edição; ausente = criação
  numeroInicial: string    // número sugerido (auto) ou atual (edição)
  metragemInicial?: string // metragem atual (edição)
  onFechar: () => void
}

export function LoteEditor({
  opId,
  itemId,
  loteId,
  numeroInicial,
  metragemInicial,
  onFechar,
}: Props) {
  const router = useRouter()
  const [numero, setNumero] = useState(numeroInicial)
  const [metragem, setMetragem] = useState(metragemInicial ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    const m = parseFloat(metragem)
    if (!numero.trim()) {
      setErro('Informe o número do lote')
      return
    }
    if (isNaN(m) || m <= 0) {
      setErro('Metragem deve ser maior que zero')
      return
    }
    setLoading(true)
    setErro('')
    try {
      if (loteId) {
        await atualizarLote({ id: loteId, numero: numero.trim(), metragem: m })
      } else {
        await criarLote({ op_id: opId, item_id: itemId, numero: numero.trim(), metragem: m })
      }
      router.refresh()
      onFechar()
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      <Input
        value={numero}
        onChange={e => setNumero(e.target.value)}
        className="h-7 text-xs w-36"
        placeholder="Número do lote"
      />
      <Input
        value={metragem}
        onChange={e => setMetragem(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        className="h-7 text-xs w-24"
        placeholder="Metros"
      />
      <Button
        size="sm"
        className="h-7 text-xs px-3"
        onClick={handleSalvar}
        disabled={loading}
      >
        {loading ? '...' : 'Salvar'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        onClick={onFechar}
        disabled={loading}
      >
        Cancelar
      </Button>
      {erro && <p className="text-xs text-red-600 w-full">{erro}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: PASS, sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/em-producao/LoteEditor.tsx
git commit -m "feat: add LoteEditor inline form component"
```

---

### Task 7: Seção "Lotes Produzidos" no OPStatusCard

Integra a listagem de lotes por película, com geração do número sugerido no cliente e gates de permissão. Também passa `lotes` de `EmProducaoList` para `OPStatusCard`.

**Files:**
- Modify: `components/em-producao/EmProducaoList.tsx`
- Modify: `components/em-producao/OPStatusCard.tsx`

- [ ] **Step 1: Passar `lotes` em `EmProducaoList`**

Em `components/em-producao/EmProducaoList.tsx`, adicione a prop `lotes` ao render do `OPStatusCard`:

```typescript
        <OPStatusCard
          key={op.id}
          op={{ id: op.id, numero: op.numero, emitida_at: op.emitida_at }}
          itens={op.itens}
          statusSetor={op.statusSetor}
          lotes={op.lotes}
          meuCargo={meuCargo}
          meuSetor={meuSetor}
        />
```

- [ ] **Step 2: Atualizar imports e Props do OPStatusCard**

Em `components/em-producao/OPStatusCard.tsx`, troque o import de tipos e adicione os imports do editor e helpers:

```typescript
import { SetorEditor } from './SetorEditor'
import { LoteEditor } from './LoteEditor'
import { concluirOP } from '@/lib/actions/em-producao'
import { excluirLote } from '@/lib/actions/em-producao'
import { codigoLote, proximoNumeroLote } from '@/lib/lotes'
import type { ItemEnriquecido, StatusSetorRow, LoteProducao, Cargo, Setor } from '@/types'
```

E atualize a interface `Props` para receber `lotes`:

```typescript
interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
  lotes: LoteProducao[]
  meuCargo: Cargo
  meuSetor: Setor | null
}
```

- [ ] **Step 3: Atualizar a desestruturação e adicionar estado/permissão de lotes**

Troque a assinatura da função e o bloco de estado inicial:

```typescript
export function OPStatusCard({ op, itens, statusSetor, lotes, meuCargo, meuSetor }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<Setor | null>(null)
  const [concluindo, setConcluindo] = useState(false)
  const [erroConclui, setErroConclui] = useState('')

  // Lotes: qual está em edição/criação. `novo:<itemId>` para criação, ou o id do lote em edição.
  const [loteEditando, setLoteEditando] = useState<string | null>(null)
  const [erroLote, setErroLote] = useState('')

  const canEditSetor = (key: Setor) =>
    meuCargo === 'admin' || meuSetor === key

  const canConcluir = meuCargo === 'admin'
  const canEditarLotes = meuCargo === 'admin' || meuSetor === 'maquina'

  const peliculasDaOP = itens.filter(i => i.pelicula_id && i.peliculas)

  async function handleExcluirLote(id: string) {
    if (!window.confirm('Excluir este lote? Esta ação não pode ser desfeita.')) return
    setErroLote('')
    try {
      await excluirLote(id)
      router.refresh()
    } catch (err: any) {
      setErroLote(err.message ?? 'Erro ao excluir lote')
    }
  }
```

> Mantenha a função `handleConcluir` existente como está.

- [ ] **Step 4: Adicionar a seção "Lotes Produzidos" no JSX**

Dentro de `<CardContent>`, **após** o `{SETORES.map(...)}` e **antes** do bloco `{canConcluir && (...)}`, adicione:

```tsx
        {peliculasDaOP.length > 0 && (
          <div className="border-t pt-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">📦 Lotes Produzidos</p>
            {erroLote && <p className="text-xs text-red-600">{erroLote}</p>}
            {peliculasDaOP.map(item => {
              const lotesItem = lotes
                .filter(l => l.item_id === item.id)
                .sort((a, b) => a.numero.localeCompare(b.numero))
              const cod = codigoLote(item.peliculas!.codigo, item.peliculas!.nome)
              const numeroSugerido = proximoNumeroLote(
                op.numero,
                cod,
                lotesItem.map(l => l.numero)
              )
              const criandoEste = loteEditando === `novo:${item.id}`

              return (
                <div key={item.id} className="text-xs">
                  <p className="font-medium text-slate-700">{item.peliculas!.nome}</p>
                  {lotesItem.length === 0 && !criandoEste && (
                    <p className="text-muted-foreground italic ml-3">Nenhum lote registrado</p>
                  )}
                  {lotesItem.map(lote =>
                    loteEditando === lote.id ? (
                      <LoteEditor
                        key={lote.id}
                        opId={op.id}
                        itemId={item.id}
                        loteId={lote.id}
                        numeroInicial={lote.numero}
                        metragemInicial={String(lote.metragem)}
                        onFechar={() => setLoteEditando(null)}
                      />
                    ) : (
                      <div key={lote.id} className="ml-3 flex items-center gap-2">
                        <span className="text-slate-800">
                          {lote.numero} — {lote.metragem}m
                        </span>
                        {lote.usuario_nome && (
                          <span className="text-[10px] text-muted-foreground">
                            por {lote.usuario_nome} • {formatDateTime(lote.created_at)}
                          </span>
                        )}
                        {canEditarLotes && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1 shrink-0"
                              onClick={() => setLoteEditando(lote.id)}
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1 shrink-0 text-red-600"
                              onClick={() => handleExcluirLote(lote.id)}
                            >
                              🗑️
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  )}
                  {criandoEste ? (
                    <LoteEditor
                      opId={op.id}
                      itemId={item.id}
                      numeroInicial={numeroSugerido}
                      onFechar={() => setLoteEditando(null)}
                    />
                  ) : (
                    canEditarLotes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 ml-3 text-blue-700"
                        onClick={() => setLoteEditando(`novo:${item.id}`)}
                      >
                        + Adicionar lote
                      </Button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: PASS, sem erros.

- [ ] **Step 6: Commit**

```bash
git add components/em-producao/EmProducaoList.tsx components/em-producao/OPStatusCard.tsx
git commit -m "feat: add Lotes Produzidos section to OP card with permission gates"
```

---

### Task 8: Campo "Código" no CRUD de Películas

**Files:**
- Modify: `components/configuracoes/PeliculaCrud.tsx`
- Modify: `app/(app)/configuracoes/page.tsx` (apenas se o select de películas não trouxer `codigo` — verificar)

- [ ] **Step 1: Verificar a query que alimenta PeliculaCrud**

Abra `app/(app)/configuracoes/page.tsx` e localize o `select` que busca películas (alimenta `<PeliculaCrud peliculas={...} />`). Se o `select` lista colunas explicitamente (ex: `'id, nome, largura, ...'`), adicione `codigo`. Se usa `select('*')`, nenhum ajuste é necessário.

Exemplo do ajuste (se aplicável):

```typescript
.from('peliculas')
.select('id, nome, codigo, largura, tonalidade, espessura, protecao_uva, protecao_uvb, estoque_minimo')
```

- [ ] **Step 2: Incluir `codigo` no tipo e estado do PeliculaCrud**

Em `components/configuracoes/PeliculaCrud.tsx`, troque `PeliculaRow`, `EditPelicula` e `emptyEdit`:

```typescript
type PeliculaRow = Pick<Pelicula, 'id' | 'nome' | 'codigo' | 'largura' | 'tonalidade' | 'espessura' | 'protecao_uva' | 'protecao_uvb' | 'estoque_minimo'>
type EditPelicula = { nome: string; codigo: string; largura: string; tonalidade: string; espessura: string; protecao_uva: string; protecao_uvb: string; estoque_minimo: string }

interface Props { peliculas: PeliculaRow[] }

const emptyEdit = (): EditPelicula => ({ nome: '', codigo: '', largura: '', tonalidade: '', espessura: '', protecao_uva: '', protecao_uvb: '', estoque_minimo: '0' })
```

- [ ] **Step 3: Incluir `codigo` na inicialização do estado de edição**

Troque o `useState(editValues)` inicial e o fallback do map de renderização para incluir `codigo`:

```typescript
  const [editValues, setEditValues] = useState<Record<string, EditPelicula>>(
    Object.fromEntries(peliculas.map(p => [p.id, {
      nome: p.nome, codigo: p.codigo ?? '', largura: p.largura, tonalidade: p.tonalidade,
      espessura: p.espessura, protecao_uva: p.protecao_uva,
      protecao_uvb: p.protecao_uvb, estoque_minimo: String(p.estoque_minimo),
    }]))
  )
```

E no `peliculas.map(p => (...))` no fim do componente, troque o objeto de fallback do `f`:

```typescript
            f={editValues[p.id] ?? { nome: p.nome, codigo: p.codigo ?? '', largura: p.largura, tonalidade: p.tonalidade, espessura: p.espessura, protecao_uva: p.protecao_uva, protecao_uvb: p.protecao_uvb, estoque_minimo: String(p.estoque_minimo) }}
```

- [ ] **Step 4: Persistir `codigo` em create e update**

Em `handleCreate`, no objeto do `.insert(...)`, adicione `codigo` (string vazia vira `null`):

```typescript
      const { error: e } = await supabase.from('peliculas').insert({
        nome: newFields.nome.trim(), codigo: newFields.codigo.trim() || null,
        largura: newFields.largura.trim(),
        tonalidade: newFields.tonalidade.trim(), espessura: newFields.espessura.trim(),
        protecao_uva: newFields.protecao_uva.trim(), protecao_uvb: newFields.protecao_uvb.trim(),
        estoque_minimo: parseFloat(newFields.estoque_minimo),
      })
```

Em `handleUpdate`, no objeto do `.update(...)`, adicione `codigo`:

```typescript
      const { error: e } = await supabase.from('peliculas').update({
        nome: val.nome.trim(), codigo: val.codigo.trim() || null,
        largura: val.largura.trim(),
        tonalidade: val.tonalidade.trim(), espessura: val.espessura.trim(),
        protecao_uva: val.protecao_uva.trim(), protecao_uvb: val.protecao_uvb.trim(),
        estoque_minimo: parseFloat(val.estoque_minimo),
      }).eq('id', id)
```

- [ ] **Step 5: Adicionar o input "Código" no FieldRow**

No componente `FieldRow`, na primeira linha de inputs (logo após o input de **Nome**), adicione o campo Código:

```tsx
        <div className="space-y-1"><Label className="text-xs">Código (lote)</Label>
          <Input className="w-28" value={f.codigo} onChange={e => onChange({ codigo: e.target.value })} placeholder="Ex: FUME" /></div>
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Esperado: PASS, sem erros.

- [ ] **Step 7: Commit**

```bash
git add components/configuracoes/PeliculaCrud.tsx "app/(app)/configuracoes/page.tsx"
git commit -m "feat: add codigo field to pelicula CRUD"
```

---

### Task 9: Build + Deploy

**Files:**
- Nenhum arquivo novo; validação final e deploy.

- [ ] **Step 1: Rodar a suíte de testes**

Run: `npx jest`
Esperado: PASS — incluindo os testes de `lotes.test.ts` e os de `calculations.test.ts`.

- [ ] **Step 2: Build de produção**

Run: `npx next build`
Esperado: build conclui sem erros de tipo ou de compilação.

- [ ] **Step 3: Commit (se houver ajustes do build) e push**

Se o build exigiu correções, faça commit delas primeiro. Depois:

```bash
git push origin master
```

Esperado: push aceito; a Vercel inicia o deploy automaticamente.

- [ ] **Step 4: Smoke test manual (pós-deploy)**

No app publicado, logado como operador da Máquina (ou admin):
1. Abra **Em Produção** numa OP com película.
2. Em "Lotes Produzidos", clique **+ Adicionar lote** — o número vem pré-preenchido (ex. `<OP>-<CODIGO>-01`).
3. Informe a metragem, salve. O lote aparece com autoria.
4. Adicione um segundo lote: o número sugerido deve ser `-02`.
5. Edite e exclua um lote.
6. Logado como operador do **Corte**: confirme que vê os lotes em leitura, **sem** botões de editar/adicionar/excluir.

---

## Notas de implementação

- **Geração do número no cliente:** o `OPStatusCard` já tem todos os lotes carregados e a `op.numero`; com `peliculas.codigo` agora no item, o número sugerido é calculado com `proximoNumeroLote` (função pura) sem chamada extra ao servidor. O servidor não regenera o número — confia no valor enviado, mas garante unicidade via constraint `UNIQUE` (erro tratado: "Número de lote já existe").
- **Autoria:** reaproveita o `perfisMap` e o padrão `usuario_nome` já usados para `status_setor`.
- **Permissão dupla:** UI esconde botões para quem não é Máquina/admin; o servidor revalida em toda action (defesa real, não só visual).
