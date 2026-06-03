# Lotes de Produção de Películas — Design

**Data:** 2026-06-03
**Status:** Aprovado

## Objetivo

Cada OP pode conter várias películas, e cada película pode ser produzida em várias bobinas. Cada bobina produzida precisa de um **lote de identificação** único para rastreabilidade. Os lotes são gerados automaticamente (recomendado), com possibilidade de override manual, e registrados pelo operador da Máquina durante a produção.

## Requisitos

- **Granularidade:** vários lotes por película dentro de uma OP. Cada lote = uma bobina produzida.
- **Quem registra:** operador da Máquina (ou admin), na tela de Em Produção.
- **Formato do número:** `{NUMERO_OP}-{CODIGO_PELICULA}-{NN}`, com a sequência `NN` reiniciando por película dentro da OP. Ex.: `0042-FUME-01`, `0042-FUME-02`.
- **Código da película:** campo dedicado opcional em `peliculas`; se vazio, usa-se um slug do nome.
- **Auto + manual:** número auto-gerado por padrão, editável (override) na criação.
- **Dados do lote:** número + metragem (metros da bobina) + autoria (quem/quando).
- **Visibilidade:** seção no card da OP em Em Produção; Máquina/admin gerenciam, Corte e demais veem em leitura.

## Modelo de Dados

### Nova tabela `lotes_producao`

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid PK (default gen_random_uuid) | identificador interno |
| `op_id` | uuid NOT NULL → `ordens_producao(id)` | a OP |
| `item_id` | uuid NOT NULL → `ordens_producao_itens(id)` | a película (linha da OP) |
| `pelicula_id` | uuid NOT NULL → `peliculas(id)` | denormalizado, facilita exibição/consulta |
| `numero` | text NOT NULL **UNIQUE** | código do lote, ex. `0042-FUME-01` |
| `metragem` | numeric NOT NULL | metros daquela bobina |
| `usuario_id` | uuid → `profiles(id)` | quem registrou (autoria) |
| `created_at` | timestamptz NOT NULL default now() | quando (autoria) |

- `numero` tem **constraint UNIQUE global** — garante rastreabilidade sem duplicatas, tanto no auto quanto no manual.
- `item_id` permite que a sequência reinicie por película dentro da OP.

### Nova coluna em `peliculas`

- `codigo` text **nullable** — sigla curta para o lote (ex. `FUME`). Definida pelo admin no CRUD de películas. Se vazia, o sistema usa um slug do `nome`.

### Migration

Aplicada **manualmente** no Supabase (mesmo padrão das features anteriores).

## Geração do Número + Override Manual

**Formato:** `{NUMERO_OP}-{CODIGO_PELICULA}-{NN}`
- `NUMERO_OP` = `ordens_producao.numero` (ex. `0042`)
- `CODIGO_PELICULA` = `peliculas.codigo` se preenchido; senão slug do `nome` (maiúsculas, sem acentos, sem caracteres não alfanuméricos; ex. "Fumê 35" → `FUME35`)
- `NN` = sequencial por película dentro da OP, 2 dígitos com zero à esquerda (`01`, `02`…)

**Cálculo do próximo `NN` (auto):**
- Buscar lotes existentes daquele `item_id`, extrair o sufixo numérico de cada `numero`, usar `max + 1` (não contagem — evita colisão quando um lote é apagado no meio). Sem lotes → começa em `01`.

**Fluxo de criação (operador da Máquina):**
1. Operador clica "+ Adicionar lote" numa película.
2. Sistema **pré-preenche** `numero` com o código auto-gerado, **editável** (override).
3. Operador informa **metragem** e confirma.
4. Servidor valida permissão (Máquina/admin), `numero` não vazio e **único** (erro claro "Número de lote já existe"). Insere com `usuario_id` e `created_at`.

**Override manual:** não precisa seguir o formato; liberdade total desde que único.

**Slug de fallback:** remove acentos (`Fumê` → `FUME`), maiúsculas, remove não alfanuméricos.

## UI no Card da OP

Abaixo das 3 linhas de setor no `OPStatusCard`, seção **"Lotes Produzidos"**:

```
📦 Lotes Produzidos
  Película Fumê 35
    • 0042-FUME-01 — 30m   por João • 03/06 14:20   🗑️
    • 0042-FUME-02 — 20m   por João • 03/06 15:10   🗑️
    [+ Adicionar lote]          ← só Máquina/admin
  Película G5
    • 0042-G5-01 — 50m     por João • 03/06 16:00   🗑️
    [+ Adicionar lote]
```

- Lista **cada película da OP** (itens com `pelicula_id`); mesclas não entram.
- Sob cada película, lotes ordenados por `numero`, mostrando `numero — metragem` + linha de autoria (`por Nome • DD/MM HH:MM`), seguindo o padrão de autoria existente.
- **"+ Adicionar lote":** formulário inline (campo `numero` pré-preenchido editável + campo `metragem`, botões Salvar/Cancelar). Novo componente `LoteEditor`, espelhando `SetorEditor`.
- Película sem lotes: "Nenhum lote registrado" + botão (para quem pode).
- **Editar lote:** reaproveita `LoteEditor` para corrigir `numero` e `metragem`.
- **Excluir lote:** ícone 🗑️ por lote, visível só para Máquina/admin, com confirmação simples.

### Permissões

- **Criar/editar/excluir lote:** `meuCargo === 'admin' || meuSetor === 'maquina'` — gating na UI **e** validação no servidor.
- **Corte e demais:** modo leitura, sem botões.

## Tipos (`types/index.ts`)

```typescript
export interface LoteProducao {
  id: string
  op_id: string
  item_id: string
  pelicula_id: string
  numero: string
  metragem: number
  usuario_id: string | null
  usuario_nome: string | null   // enriquecido (padrão de autoria)
  created_at: string
}
```

- `Pelicula` ganha `codigo: string | null`.
- `OPEmProducao` ganha `lotes: LoteProducao[]`.

## Query Layer (`lib/queries/em-producao.ts`)

- Novo passo: buscar `lotes_producao` por `op_id IN (opIds)`.
- Incluir os `usuario_id` dos lotes na busca de perfis (reaproveitar `perfisMap`).
- Enriquecer cada lote com `usuario_nome` e anexar `lotes` filtrados por OP no retorno de cada `OPEmProducao`.

## Server Actions (`lib/actions/em-producao.ts`)

Padrão auth + validação de setor:

- `criarLote({ op_id, item_id, numero, metragem })` — valida user, perfil (`admin` ou `setor==='maquina'`), `numero` não vazio. Deriva `pelicula_id` do item. Insere; trata erro de unicidade → "Número de lote já existe".
- `atualizarLote({ id, numero, metragem })` — mesmas permissões; valida unicidade.
- `excluirLote(id)` — mesmas permissões.
- `gerarNumeroLote({ op_id, item_id })` — helper que retorna o próximo código auto (número da OP + código/slug da película + `max+1` do sufixo). Usado pelo `LoteEditor` para pré-preencher.

## CRUD de Películas (Configurações)

- O componente de CRUD de películas ganha um campo opcional **"Código"** (input curto), salvo em `peliculas.codigo`.

## Arquivos Afetados

- `types/index.ts` — tipos (`LoteProducao`, `Pelicula.codigo`, `OPEmProducao.lotes`)
- Migration SQL (manual) — tabela `lotes_producao` + coluna `peliculas.codigo`
- `lib/queries/em-producao.ts` — busca/enriquecimento de lotes
- `lib/actions/em-producao.ts` — actions + helper `gerarNumeroLote`
- `components/em-producao/OPStatusCard.tsx` — seção "Lotes Produzidos"
- `components/em-producao/LoteEditor.tsx` — **novo** componente
- CRUD de películas (Configurações) — campo "Código"

## Fora de Escopo (YAGNI)

- Busca/relatório global de lotes (digitar número e achar a OP) — pode ser feature futura.
- Validação de formato no override manual.
- Lotes para mesclas ou outros setores.
