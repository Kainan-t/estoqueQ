# Alerta de Matérias-Primas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/materias-primas` que lista todas as MPs com seus saldos e exibe um badge de alerta quando `em_alerta` é `true`.

**Architecture:** Server Component assíncrono que chama `getMateriasComSaldo()` diretamente; renderiza `<Table>` com uma coluna "Status" que exibe `<Badge variant="destructive">` condicionalmente. Sem estado no cliente, sem nova query.

**Tech Stack:** Next.js App Router (Server Component), React Testing Library + Jest, shadcn/ui (`Table`, `Badge`).

---

## Mapa de arquivos

| Ação | Caminho | Responsabilidade |
|---|---|---|
| Criar | `app/materias-primas/page.tsx` | Server Component — lista MPs com badge de alerta |
| Criar | `__tests__/materias-primas-page.test.tsx` | Testes RTL para o badge condicional |

---

## Task 1: Escrever o teste que falha

**Files:**
- Create: `__tests__/materias-primas-page.test.tsx`

- [ ] **Step 1: Criar o arquivo de teste**

```tsx
// __tests__/materias-primas-page.test.tsx
import { render, screen } from '@testing-library/react'
import type { MateriaPrimaComSaldo } from '@/types'

jest.mock('@/lib/queries/materias-primas')
import Page from '@/app/materias-primas/page'
import { getMateriasComSaldo } from '@/lib/queries/materias-primas'

const makeMP = (overrides: Partial<MateriaPrimaComSaldo> = {}): MateriaPrimaComSaldo => ({
  id: '1',
  nome: 'Cimento',
  unidade: 'kg',
  estoque_minimo: 100,
  created_at: '2026-01-01',
  saldo: 80,
  em_alerta: true,
  ...overrides,
})

describe('MateriasPage', () => {
  it('exibe badge quando em_alerta é true', async () => {
    ;(getMateriasComSaldo as jest.Mock).mockResolvedValue([makeMP({ em_alerta: true })])
    const jsx = await Page()
    render(jsx)
    expect(screen.getByText('Abaixo do mínimo')).toBeInTheDocument()
  })

  it('não exibe badge quando em_alerta é false', async () => {
    ;(getMateriasComSaldo as jest.Mock).mockResolvedValue([makeMP({ em_alerta: false, saldo: 200 })])
    const jsx = await Page()
    render(jsx)
    expect(screen.queryByText('Abaixo do mínimo')).not.toBeInTheDocument()
  })

  it('exibe o nome e o saldo da MP', async () => {
    ;(getMateriasComSaldo as jest.Mock).mockResolvedValue([makeMP({ nome: 'Areia', saldo: 50 })])
    const jsx = await Page()
    render(jsx)
    expect(screen.getByText('Areia')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste para verificar que falha**

```bash
npx jest __tests__/materias-primas-page.test.tsx --no-coverage
```

Expected: `FAIL` — `Cannot find module '@/app/materias-primas/page'`

---

## Task 2: Implementar a página

**Files:**
- Create: `app/materias-primas/page.tsx`

- [ ] **Step 1: Criar o arquivo de página**

```tsx
// app/materias-primas/page.tsx
import { getMateriasComSaldo } from '@/lib/queries/materias-primas'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function MateriasPage() {
  const materias = await getMateriasComSaldo()

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Matérias-Primas</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materias.map((mp) => (
            <TableRow key={mp.id}>
              <TableCell>{mp.nome}</TableCell>
              <TableCell>{mp.unidade}</TableCell>
              <TableCell>{mp.saldo}</TableCell>
              <TableCell>
                {mp.em_alerta && (
                  <Badge variant="destructive">Abaixo do mínimo</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
```

- [ ] **Step 2: Rodar os testes novamente**

```bash
npx jest __tests__/materias-primas-page.test.tsx --no-coverage
```

Expected: `PASS` — 3 testes aprovados.

Se falhar com erro de `"use client"` nos componentes de UI, adicione ao topo do arquivo de teste (antes dos imports):

```tsx
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}))
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))
```

- [ ] **Step 3: Commit**

```bash
git add app/materias-primas/page.tsx __tests__/materias-primas-page.test.tsx
git commit -m "feat: página de matérias-primas com badge de alerta"
```
