# Design: Sinalização de Alerta — Matérias-Primas

**Data:** 2026-05-27

## Objetivo

Exibir uma página que lista todas as matérias-primas com seus saldos e sinaliza visualmente aquelas que estão abaixo ou no limite do estoque mínimo (`em_alerta: true`).

## Escopo

**Incluso:**
- Rota `app/materias-primas/page.tsx` (Server Component)
- Tabela com colunas: Nome, Unidade, Saldo, Status
- Badge de alerta condicional quando `em_alerta` é `true`

**Fora do escopo:**
- Formulário de entrada / reposição de estoque
- Botão "Reestocar"
- Página de detalhe individual da MP
- Navegação entre páginas

## Arquitetura

### Fonte de dados

A função `getMateriasComSaldo()` em `lib/queries/materias-primas.ts` já retorna `MateriaPrimaComSaldo[]`, incluindo o campo `em_alerta: boolean`. Nenhuma query nova é necessária.

### Componente de página

`app/materias-primas/page.tsx` — Server Component que:
1. Chama `getMateriasComSaldo()`
2. Renderiza uma `<Table>` (de `components/ui/table.tsx`) com uma linha por MP
3. Na coluna "Status", exibe `<Badge variant="destructive">Abaixo do mínimo</Badge>` se `em_alerta`, ou nada caso contrário

### Componentes reutilizados

| Componente | Origem | Uso |
|---|---|---|
| `Table`, `TableRow`, etc. | `components/ui/table.tsx` | Lista de MPs |
| `Badge` | `components/ui/badge.tsx` | Indicador de alerta |

## Comportamento

- Itens em alerta aparecem na tabela junto com os demais (sem filtragem ou reordenação especial)
- O badge é puramente visual — sem interação ao clicar
- A página é estática (sem polling ou refresh automático)

## O que não muda

- Nenhuma query, tipo ou cálculo existente é alterado
- `em_alerta` permanece `saldo <= mp.estoque_minimo` (comportamento validado)
