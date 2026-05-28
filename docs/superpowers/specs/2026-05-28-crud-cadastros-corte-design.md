# Design: CRUD de Cadastros + Módulo de Corte

**Data:** 2026-05-28  
**Status:** Aprovado  

---

## Contexto

O EstoqueQ controla três processos de produção:

1. **Mescla química** — consumo de matérias-primas, rastreado via Ordens de Produção (itens de mescla)
2. **Produção da película** — consumo de mescla e película, rastreado via OP (itens de película), gera bobinas de até 4000 m
3. **Corte** — bobinas são cortadas em rolos de 152 m e qualificadas (verde/amarelo/vermelho), gerando o estoque de Produtos Finalizados

Hoje o app não tem:
- Formulários para criar/editar/excluir MPs, películas e mesclas (só é possível via Supabase dashboard)
- Um setor dedicado ao Corte (o registro de produção de PF era feito dentro de Produtos Finalizados sem vínculo com a OP)

---

## Frente 1 — CRUD de Cadastros

### Acesso
Restrito a usuários com `cargo = 'admin'`. Integrado à página `/configuracoes` existente, que já é admin-only.

### Matérias-Primas
Novo bloco em Configurações abaixo dos existentes.

**Campos:**
- `nome` (texto, obrigatório)
- `unidade` (texto, ex: kg / L / g, obrigatório)
- `estoque_minimo` (número ≥ 0, obrigatório)

**Comportamentos:**
- Lista todas as MPs com edição inline (salvar por linha)
- Botão "Nova MP" abre formulário no topo da lista
- Botão excluir por linha com `window.confirm`
- Exclusão bloqueada (erro amigável) se a MP tiver movimentações em `movimentacoes_mp` ou for ingrediente em `mescla_ingredientes`

### Películas
Mesmo padrão.

**Campos:**
- `nome` (texto, obrigatório)
- `largura` (texto, ex: "1,52m")
- `tonalidade` (texto)
- `espessura` / micragem (texto, ex: "50µ")
- `protecao_uva` (texto)
- `protecao_uvb` (texto)
- `estoque_minimo` (número ≥ 0, metros)

**Comportamentos:**
- Lista com edição inline
- Exclusão bloqueada se houver movimentações em `movimentacoes_pelicula` ou se for item de alguma OP

### Mesclas
Mesmo padrão, com sub-lista de ingredientes.

**Campos da mescla:**
- `nome` (texto, obrigatório)

**Ingredientes (1..n):**
- `materia_prima_id` (select das MPs cadastradas)
- `quantidade_por_mescla` (número > 0, em kg)

**Comportamentos:**
- Lista as mesclas; cada uma expande exibindo seus ingredientes
- "Nova Mescla" abre formulário com campo nome + linhas de ingrediente (add/remove)
- Edição de mescla existente: nome inline + gerenciar ingredientes (add/remove)
- Exclusão de mescla bloqueada se for item de alguma OP

### Implementação
Operações diretas via Supabase client (`insert` / `update` / `delete`). Sem RPC. Padrão idêntico ao `ConfiguracoesClient.tsx` existente.

---

## Frente 2 — Módulo de Corte

### Fluxo
```
OP emitida (película + mescla debitados)
        ↓
  Bobinas produzidas (até 4000 m)
        ↓
  Corte — operador registra vínculando à OP
        ↓
  movimentacoes_pf (tipo='producao') + ordem_producao_id
        ↓
  Estoque de Produtos Finalizados atualizado
```

### Mudança de banco
```sql
ALTER TABLE public.movimentacoes_pf
  ADD COLUMN IF NOT EXISTS ordem_producao_id uuid
  REFERENCES public.ordens_producao(id);
```
Nullable — registros antigos continuam sem FK.

### Navegação
Novo item "✂️ Corte" no sidebar e bottom nav, entre Ordens de Produção e Produtos Finalizados.

### Páginas

#### `/corte` — Lista de cortes
- Tabela com: data, OP vinculada, produto finalizado, metros cortados, cx_verdes / cx_amarelas / cx_vermelhas
- Ordenado por `created_at` DESC
- Botão "Registrar Corte" → `/corte/novo`

#### `/corte/novo` — Formulário de novo corte
Campos:

| Campo | Tipo | Obrigatório | Detalhe |
|---|---|---|---|
| OP | Select | ✅ | Apenas OPs com `status = 'emitida'` |
| Produto Finalizado | Select | ✅ | Lista de `produtos_finalizados` |
| Data | Date | ✅ | Default: hoje |
| Metros cortados | Número decimal | ✅ | > 0 |
| Metros por caixa | Número | ✅ | Default: 152 |
| Caixas verdes | Inteiro ≥ 0 | ✅ | |
| Caixas amarelas | Inteiro ≥ 0 | ✅ | |
| Caixas vermelhas | Inteiro ≥ 0 | ✅ | |
| Observação | Texto | ❌ | |

Ao salvar: `supabase.from('movimentacoes_pf').insert({ tipo: 'producao', ordem_producao_id, produto_id, ... })`.

Validação: pelo menos uma caixa deve ser > 0.

#### `/corte/[id]` — Detalhe do corte
Exibe todos os campos do registro. Link para a OP vinculada. Botão "← Voltar para Corte".

### Mudança em Produtos Finalizados
- Remover o formulário de registrar `tipo: 'producao'` da página/componente de PF
- Manter apenas o registro de expedição (`tipo: 'expedicao'`)
- O saldo (`calcularSaldoPF`) continua funcionando sem alteração — lê `movimentacoes_pf` independente de onde foi inserido

---

## Arquivos afetados

### Novos
- `components/configuracoes/MPCrud.tsx`
- `components/configuracoes/PeliculaCrud.tsx`
- `components/configuracoes/MesclaCrud.tsx`
- `components/corte/CorteList.tsx`
- `components/corte/NovoCorteForm.tsx`
- `components/corte/CorteDetail.tsx`
- `app/(app)/corte/page.tsx`
- `app/(app)/corte/novo/page.tsx`
- `app/(app)/corte/[id]/page.tsx`
- `lib/queries/corte.ts`

### Modificados
- `app/(app)/configuracoes/ConfiguracoesClient.tsx` — adicionar 3 novos blocos de CRUD
- `app/(app)/configuracoes/page.tsx` — buscar películas e mesclas adicionalmente
- `components/produtos-finalizados/MovimentacaoPFForm.tsx` (ou equivalente) — remover opção `tipo: 'producao'`
- `components/layout/Sidebar.tsx` — novo item Corte
- `components/layout/BottomNav.tsx` — novo item Corte
- `types/index.ts` — adicionar `ordem_producao_id?: string | null` em `MovimentacaoPF`

### SQL
```sql
ALTER TABLE public.movimentacoes_pf
  ADD COLUMN IF NOT EXISTS ordem_producao_id uuid
  REFERENCES public.ordens_producao(id);

NOTIFY pgrst, 'reload schema';
```

---

## Fora do escopo
- Status "concluída" nas OPs após Corte (pode ser adicionado depois)
- Relatório específico de Corte (usa o Relatórios existente)
- Bloqueio de OP duplicada em múltiplos cortes
