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
