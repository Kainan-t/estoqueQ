import { calcularSaldoMP, calcularSaldoPF } from '@/lib/calculations'
import type { MovimentacaoMP, MovimentacaoPF } from '@/types'

const baseMov = {
  id: '1', materia_prima_id: 'mp1', data: '2026-05-01',
  usuario_id: 'u1', observacao: null, created_at: '2026-05-01',
}

describe('calcularSaldoMP', () => {
  it('retorna 0 para lista vazia', () => {
    expect(calcularSaldoMP([])).toBe(0)
  })

  it('soma entradas corretamente', () => {
    const movs: MovimentacaoMP[] = [
      { ...baseMov, tipo: 'entrada', quantidade: 100 },
      { ...baseMov, tipo: 'entrada', quantidade: 50 },
    ]
    expect(calcularSaldoMP(movs)).toBe(150)
  })

  it('subtrai saidas das entradas', () => {
    const movs: MovimentacaoMP[] = [
      { ...baseMov, tipo: 'entrada', quantidade: 100 },
      { ...baseMov, tipo: 'saida', quantidade: 30 },
    ]
    expect(calcularSaldoMP(movs)).toBe(70)
  })

  it('pode retornar negativo se saidas excedem entradas', () => {
    const movs: MovimentacaoMP[] = [
      { ...baseMov, tipo: 'entrada', quantidade: 10 },
      { ...baseMov, tipo: 'saida', quantidade: 20 },
    ]
    expect(calcularSaldoMP(movs)).toBe(-10)
  })
})

const basePF = {
  id: '1', produto_id: 'pf1', data: '2026-05-01',
  usuario_id: 'u1', observacao: null, created_at: '2026-05-01',
}

describe('calcularSaldoPF', () => {
  it('retorna zeros para lista vazia', () => {
    const result = calcularSaldoPF([])
    expect(result).toEqual({
      cx_verdes: 0, cx_amarelas: 0, cx_vermelhas: 0,
      total_caixas: 0, metros_estimados: 0,
    })
  })

  it('soma producao por cor', () => {
    const movs: MovimentacaoPF[] = [
      { ...basePF, tipo: 'producao', metros_por_caixa: 20,
        cx_verdes: 15, cx_amarelas: 4, cx_vermelhas: 1 },
    ]
    const result = calcularSaldoPF(movs)
    expect(result.cx_verdes).toBe(15)
    expect(result.cx_amarelas).toBe(4)
    expect(result.cx_vermelhas).toBe(1)
    expect(result.total_caixas).toBe(20)
  })

  it('subtrai expedicao por cor', () => {
    const movs: MovimentacaoPF[] = [
      { ...basePF, tipo: 'producao', metros_por_caixa: 20,
        cx_verdes: 15, cx_amarelas: 4, cx_vermelhas: 1 },
      { ...basePF, tipo: 'expedicao', metros_por_caixa: null,
        cx_verdes: 10, cx_amarelas: 0, cx_vermelhas: 0 },
    ]
    const result = calcularSaldoPF(movs)
    expect(result.cx_verdes).toBe(5)
    expect(result.total_caixas).toBe(10)
  })

  it('calcula metros estimados pela media dos lotes', () => {
    const movs: MovimentacaoPF[] = [
      { ...basePF, tipo: 'producao', metros_por_caixa: 20,
        cx_verdes: 10, cx_amarelas: 0, cx_vermelhas: 0 },
    ]
    const result = calcularSaldoPF(movs)
    expect(result.metros_estimados).toBe(200)
  })

  it('clamp: total_caixas equals soma das cores clamped, nunca negativo', () => {
    // Produce 3 green + 5 yellow, then ship 5 green (over-expediting green)
    const movs: MovimentacaoPF[] = [
      { ...basePF, tipo: 'producao', metros_por_caixa: 10,
        cx_verdes: 3, cx_amarelas: 5, cx_vermelhas: 0 },
      { ...basePF, tipo: 'expedicao', metros_por_caixa: null,
        cx_verdes: 5, cx_amarelas: 0, cx_vermelhas: 0 },
    ]
    const result = calcularSaldoPF(movs)
    expect(result.cx_verdes).toBe(0)          // clamped from -2
    expect(result.cx_amarelas).toBe(5)
    expect(result.cx_vermelhas).toBe(0)
    expect(result.total_caixas).toBe(5)        // 0 + 5 + 0, not raw -2+5+0=3
    expect(result.cx_verdes + result.cx_amarelas + result.cx_vermelhas).toBe(result.total_caixas)
  })
})
