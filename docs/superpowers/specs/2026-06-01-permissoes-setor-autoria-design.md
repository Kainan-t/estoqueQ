# Permissões por Setor + Autoria Inline — Design Spec

## Goal

Adicionar permissões por setor ao módulo "Em Produção" (cada operador só pode editar seu próprio setor) e exibir inline quem registrou cada status, com data/hora.

## Architecture

Nova coluna `setor` em `profiles` define a qual setor cada operador pertence. A página `/em-producao` lê o perfil do usuário logado e repassa para os cards — botões de ação ficam visíveis apenas para o setor correspondente (ou para admin). As server actions validam isso server-side. A query de Em Produção é enriquecida com nomes de perfil para exibir autoria inline.

## Tech Stack

Next.js 15 App Router, TypeScript, Supabase (SSR + Server Actions), shadcn/ui, Tailwind CSS.

---

## Database

### Alteração: tabela `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN setor text
  CHECK (setor IN ('quimico', 'maquina', 'corte'));
```

- Nullable: admins e operadores sem setor fixo ficam com `NULL`
- Nenhuma outra migração necessária — todas as tabelas de movimentação já têm `usuario_id`

---

## Types (`types/index.ts`)

### Novo tipo `Setor`

```ts
export type Setor = 'quimico' | 'maquina' | 'corte'
```

### Atualização: `Profile`

```ts
export interface Profile {
  id: string
  nome: string
  cargo: Cargo
  setor: Setor | null   // NEW
  created_at: string
}
```

### Atualização: `StatusSetorRow`

Adicionar campo de exibição enriquecido (não existe na DB, preenchido na query):

```ts
export interface StatusSetorRow {
  id: string
  op_id: string
  setor: Setor
  item_id: string
  updated_at: string
  usuario_id: string | null
  usuario_nome: string | null   // NEW — enriquecido pela query layer
}
```

---

## Query Layer (`lib/queries/em-producao.ts`)

Após buscar os `status_setor`, buscar os perfis dos `usuario_id` distintos via `.in()` separado e enriquecer cada row com `usuario_nome`:

```ts
// Após buscar statusSetorRaw:
const usuarioIds = [...new Set(
  (statusSetorRaw ?? []).map(s => s.usuario_id).filter(Boolean)
)]
const { data: perfisRaw } = usuarioIds.length
  ? await supabase.from('profiles').select('id, nome').in('id', usuarioIds)
  : { data: [] }
const perfisMap = new Map((perfisRaw ?? []).map(p => [p.id, p.nome]))

// Ao montar cada StatusSetorRow:
usuario_nome: s.usuario_id ? (perfisMap.get(s.usuario_id) ?? null) : null
```

---

## Server Actions (`lib/actions/em-producao.ts`)

### `upsertStatusSetor`

Adicionar validação: lança erro se o usuário não é admin e o setor não coincide com o seu:

```ts
export async function upsertStatusSetor(data: {
  op_id: string
  setor: Setor
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles').select('cargo, setor').eq('id', user.id).single()

  if (profile?.cargo !== 'admin' && profile?.setor !== data.setor) {
    throw new Error('Sem permissão para editar este setor')
  }

  const { error } = await supabase.from('status_setor').upsert(
    { op_id: data.op_id, setor: data.setor, item_id: data.item_id,
      updated_at: new Date().toISOString(), usuario_id: user.id },
    { onConflict: 'op_id,setor' }
  )
  if (error) throw new Error(error.message)
}
```

### `concluirOP`

Adicionar validação: apenas admin pode concluir:

```ts
export async function concluirOP(op_id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles').select('cargo').eq('id', user.id).single()

  if (profile?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem concluir OPs')
  }

  const { error } = await supabase
    .from('ordens_producao').update({ status: 'concluida' }).eq('id', op_id)
  if (error) throw new Error(error.message)
}
```

---

## Page: `/em-producao` (`app/(app)/em-producao/page.tsx`)

Buscar perfil do usuário logado além dos dados da OP:

```ts
const [opsEmProducao, { data: perfilUsuario }] = await Promise.all([
  getOPsEmProducao(),
  supabase.from('profiles').select('cargo, setor').eq('id', user.id).single(),
])

const meuCargo = perfilUsuario?.cargo ?? 'operador'
const meuSetor = perfilUsuario?.setor ?? null

return <EmProducaoList ops={opsEmProducao} meuCargo={meuCargo} meuSetor={meuSetor} />
```

---

## Componente: `EmProducaoList` (`components/em-producao/EmProducaoList.tsx`)

Adicionar props `meuCargo` e `meuSetor` e repassar para cada `OPStatusCard`:

```ts
interface Props {
  ops: OPEmProducao[]
  meuCargo: Cargo
  meuSetor: Setor | null
}
```

---

## Componente: `OPStatusCard` (`components/em-producao/OPStatusCard.tsx`)

### Props adicionais

```ts
interface Props {
  op: { id: string; numero: string; emitida_at: string }
  itens: ItemEnriquecido[]
  statusSetor: StatusSetorRow[]
  meuCargo: Cargo          // NEW
  meuSetor: Setor | null   // NEW
}
```

### Lógica de permissão

```ts
const canEditSetor = (key: Setor) =>
  meuCargo === 'admin' || meuSetor === key

const canConcluir = meuCargo === 'admin'
```

- Botões "▶ Iniciar" e "✏️ Editar": renderizados somente se `canEditSetor(key)` for `true`
- Botão "✅ Marcar como Concluída": renderizado somente se `canConcluir` for `true`

### Exibição de autoria

Para cada setor com status preenchido, exibir abaixo do nome do item:

```tsx
{status && itemAtual && (
  <span className="text-[10px] text-muted-foreground">
    por {status.usuario_nome ?? '?'} •{' '}
    {new Date(status.updated_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit'
    })}{' '}
    {new Date(status.updated_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    })}
  </span>
)}
```

Layout de cada linha de setor quando preenchida:

```
🧪 Químico  |  MesclaPS ✓         |  ✏️ Editar (se permitido)
              por João • 25/05 14h32
```

---

## Configurações (`app/(app)/configuracoes/`)

### `configuracoes/page.tsx`

Atualizar a query de usuários para incluir `setor`:

```ts
supabase.from('profiles').select('id, nome, cargo, setor').order('nome')
```

Atualizar o tipo de `usuarios` em `ConfiguracoesClient` para incluir `setor: Setor | null`.

### `ConfiguracoesClient.tsx`

Na seção de Usuários, adicionar dropdown de setor para operadores:

```tsx
// Apenas quando u.cargo === 'operador'
<Select
  value={u.setor ?? ''}
  onValueChange={(val) => alterarSetor(u.id, val as Setor | null)}
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
```

Nova função `alterarSetor`:

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

---

## Autoria em outros módulos

As movimentações de MP, Película e Corte já exibem `profiles?.nome` nas suas respectivas telas de detalhe. Nenhuma alteração necessária. PFDetail deve ser verificado durante a implementação — se `profiles?.nome` não estiver sendo exibido, adicioná-lo seguindo o mesmo padrão dos outros módulos.

---

## Data Flow

```
[Admin abre Configurações]
  → Seleciona setor de cada operador → profiles.setor atualizado

[Operador do Químico abre /em-producao]
  → Vê todos os setores, mas só botões do Químico estão visíveis
  → Clica ▶ Iniciar / ✏️ Editar → SetorEditor
  → Server action valida setor → upsert → refresh
  → Card exibe "MesclaPS ✓ por [Nome] • [data hora]"

[Admin abre /em-producao]
  → Todos os botões visíveis + "✅ Marcar como Concluída"
  → Server action valida cargo admin → OP.status = 'concluida'
```

---

## Out of Scope (v1)

- Operadores sem setor atribuído: podem ver mas não editar nada em Em Produção
- Múltiplos setores por operador
- Permissões em outros módulos (MP, PF, Película, OPs)
- Notificação ao admin quando todos setores estiverem preenchidos
