import { render, screen } from '@testing-library/react'
import { MPList } from '@/components/materias-primas/MPList'
import type { MateriaPrimaComSaldo } from '@/types'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

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

describe('MPList', () => {
  it('exibe mensagem quando lista está vazia', () => {
    render(<MPList materias={[]} />)
    expect(screen.getByText('Nenhuma matéria-prima cadastrada.')).toBeInTheDocument()
  })

  it('exibe badge de alerta quando em_alerta é true', () => {
    render(<MPList materias={[makeMP({ em_alerta: true })]} />)
    expect(screen.getByText('⚠️ Alerta')).toBeInTheDocument()
  })

  it('não exibe badge quando em_alerta é false', () => {
    render(<MPList materias={[makeMP({ em_alerta: false, saldo: 200 })]} />)
    expect(screen.queryByText('⚠️ Alerta')).not.toBeInTheDocument()
  })

  it('exibe nome e saldo formatado', () => {
    render(<MPList materias={[makeMP({ nome: 'Areia', saldo: 50, unidade: 'kg' })]} />)
    expect(screen.getByText('Areia')).toBeInTheDocument()
    expect(screen.getByText('50.0 kg')).toBeInTheDocument()
  })

  it('link aponta para a página de detalhe da MP', () => {
    render(<MPList materias={[makeMP({ id: 'abc123' })]} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/materias-primas/abc123')
  })
})
