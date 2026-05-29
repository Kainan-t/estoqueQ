# Em Produção — Design Spec

## Goal

Adicionar um módulo de status de produção em tempo real que permite a cada setor (Químico, Máquina, Corte) registrar manualmente o que está executando no momento, a partir dos itens de uma OP emitida. O status fica visível para todos via dashboard e via página dedicada no sidebar.

## Architecture

Nova tabela `status_setor` armazena uma linha por (OP × setor) com o item da OP que o setor está executando. A página `/em-producao` lista todas as OPs emitidas com o status de cada setor. O dashboard ganha um card "Em produção agora" que lê dessa mesma tabela. Quando todos os setores concluem, a OP é marcada como `concluida`.

## Tech Stack

Next.js 15 App Router, TypeScript, Supabase (SSR + Server Actions), shadcn/ui, Tailwind CSS.

---

## Database

### Nova tabela: `status_setor`

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

- Upsert com `ON CONFLICT (op_id, setor) DO UPDATE SET item_id = ..., updated_at = now(), usuario_id = ...`
- Deletar a linha quando o setor quiser limpar o status (opcional — não obrigatório na v1)

### Atualização: `StatusOP`

Adicionar `'concluida'` ao tipo `StatusOP` em `types/index.ts`:

```ts
export type StatusOP = 'rascunho' | 'emitida' | 'concluida' | 'cancelada'
```

Nenhuma migração de coluna necessária — a coluna `status` já é `text` no Supabase. Apenas atualizar o tipo TypeScript e o CHECK constraint se existir.

---

## Page: `/em-producao`

**Arquivo:** `app/(app)/em-producao/page.tsx`

Server component. Carrega:
1. Todas as OPs com `status = 'emitida'`, ordenadas por `emitida_at DESC`
2. Itens de cada OP (`ordens_producao_itens`) com nomes de mescla e película
3. Todos os `status_setor` para essas OPs

Renderiza um `EmProducaoList` passando os dados.

### Componente: `EmProducaoList`

**Arquivo:** `components/em-producao/EmProducaoList.tsx`

Server component. Recebe `ops` (com itens e status de cada setor) e renderiza um `OPStatusCard` por OP.

### Componente: `OPStatusCard`

**Arquivo:** `components/em-producao/OPStatusCard.tsx`

Client component (precisa de interatividade para o dropdown inline).

Props:
```ts
interface Props {
  op: {
    id: string
    numero: string
    emitida_at: string
  }
  itens: OrdemProducaoItem[]       // com peliculas e mesclas populados
  statusSetor: StatusSetorRow[]    // status atual de cada setor nessa OP
}
```

Layout:
- Cabeçalho: número da OP, data de emissão, badge "emitida"
- 3 linhas (Químico, Máquina, Corte):
  - Se sem status: badge "Não iniciado" + botão "▶ Iniciar" → abre `SetorEditor` inline
  - Se com status: mostra nome do item + botão "✏️ Editar" → abre `SetorEditor` inline
- Botão "✅ Marcar como Concluída" → chama Server Action `concluirOP(op_id)`

### Componente: `SetorEditor`

**Arquivo:** `components/em-producao/SetorEditor.tsx`

Client component. Inline dentro do `OPStatusCard`.

Props:
```ts
interface Props {
  opId: string
  setor: 'quimico' | 'maquina' | 'corte'
  opcoes: { id: string; label: string }[]  // itens filtrados da OP para esse setor
  itemAtualId?: string
  onSalvo: () => void
}
```

Itens disponíveis por setor:
- **Químico**: `itens.filter(i => i.mescla_id)` → label: `mesclas.nome`
- **Máquina**: `itens.filter(i => i.pelicula_id)` → label: `peliculas.nome + ' — ' + quantidade + 'm'`
- **Corte**: `itens.filter(i => i.pelicula_id)` → label: `peliculas.nome`

Ao salvar chama Server Action `upsertStatusSetor({ op_id, setor, item_id, usuario_id })` e depois `router.refresh()`.

---

## Server Actions

**Arquivo:** `lib/actions/em-producao.ts`

```ts
// Upsert status de um setor para uma OP
export async function upsertStatusSetor(data: {
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_id: string
  usuario_id: string
}): Promise<void>

// Marcar OP como concluída
export async function concluirOP(op_id: string): Promise<void>
```

Ambas usam `await createClient()` (SSR) e lançam erro se falhar.

---

## Dashboard Card: "Em produção agora"

**Arquivo:** `components/dashboard/EmProducaoAgora.tsx`

Server component. Props:

```ts
interface StatusAtivo {
  op_numero: string
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_label: string  // nome da mescla ou película
}

interface Props {
  statuses: StatusAtivo[]
}
```

Renderiza agrupado por OP, depois por setor. Setores sem status mostram "Aguardando" em muted. Link "Ver tudo →" para `/em-producao`.

**`app/(app)/dashboard/page.tsx`** — adicionar query usando o padrão estabelecido no projeto (sem joins PostgREST — sempre `SELECT *` + enrichment via `.in()` separado para evitar falhas silenciosas de cache):

```ts
// 1. Busca todas as OPs emitidas
const { data: opsEmitidas } = await supabase
  .from('ordens_producao')
  .select('id, numero')
  .eq('status', 'emitida')

const opIds = (opsEmitidas ?? []).map(op => op.id)

// 2. Busca status_setor dessas OPs
const { data: statusSetorRaw } = opIds.length
  ? await supabase.from('status_setor').select('*').in('op_id', opIds)
  : { data: [] }

// 3. Busca nomes dos itens separadamente
const itemIds = (statusSetorRaw ?? []).map(s => s.item_id)
const { data: itensRaw } = itemIds.length
  ? await supabase
      .from('ordens_producao_itens')
      .select('id, pelicula_id, mescla_id, quantidade')
      .in('id', itemIds)
  : { data: [] }
// Enriquecer itensRaw com nomes via peliculas.in() e mesclas.in() separados
```

Posição no dashboard: **antes** de `RecentMovements`, **depois** de `StockAlerts`.

---

## Navigation

### Sidebar (`components/layout/Sidebar.tsx`)

Adicionar entre OPs e Corte:
```ts
{ href: '/em-producao', label: 'Em Produção', icon: '🏭' }
```

### BottomNav (`components/layout/BottomNav.tsx`)

Adicionar na mesma posição:
```ts
{ href: '/em-producao', label: 'Em Produção', icon: '🏭' }
```

---

## Data Flow Summary

```
[Operador abre /em-producao]
  → Vê OPs emitidas com status de cada setor
  → Clica ▶ Iniciar / ✏️ Editar
  → SetorEditor mostra dropdown dos itens do setor na OP
  → Seleciona item → upsertStatusSetor() → router.refresh()

[Admin abre /em-producao]
  → Todos os setores preenchidos → clica ✅ Marcar como Concluída
  → concluirOP() → OP.status = 'concluida'
  → OP desaparece da página (não é mais 'emitida')

[Dashboard]
  → Card "Em produção agora" lê status_setor das OPs emitidas
  → Mostra setor → item por OP
```

---

## Out of Scope (v1)

- Notificações push quando um setor inicia/conclui
- Histórico de status (quando começou, quando terminou)
- Permissões por setor (qualquer operador pode editar qualquer setor)
- Limpar/resetar status individual de um setor
