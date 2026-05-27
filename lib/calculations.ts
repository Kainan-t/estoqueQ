import type { MovimentacaoMP, MovimentacaoPF, SaldoPF } from '@/types'

export function calcularSaldoMP(movimentacoes: MovimentacaoMP[]): number {
  return movimentacoes.reduce((acc, mov) => {
    return mov.tipo === 'entrada' ? acc + mov.quantidade : acc - mov.quantidade
  }, 0)
}

export function calcularSaldoPF(movimentacoes: MovimentacaoPF[]): SaldoPF {
  let cx_verdes = 0, cx_amarelas = 0, cx_vermelhas = 0
  let total_metros = 0, total_caixas_prod = 0

  for (const mov of movimentacoes) {
    if (mov.tipo === 'producao') {
      cx_verdes += mov.cx_verdes
      cx_amarelas += mov.cx_amarelas
      cx_vermelhas += mov.cx_vermelhas
      if (mov.metros_por_caixa) {
        const cx = mov.cx_verdes + mov.cx_amarelas + mov.cx_vermelhas
        total_metros += cx * mov.metros_por_caixa
        total_caixas_prod += cx
      }
    } else {
      cx_verdes -= mov.cx_verdes
      cx_amarelas -= mov.cx_amarelas
      cx_vermelhas -= mov.cx_vermelhas
    }
  }

  const total_caixas = Math.max(0, cx_verdes + cx_amarelas + cx_vermelhas)
  const media = total_caixas_prod > 0 ? total_metros / total_caixas_prod : 0
  return {
    cx_verdes: Math.max(0, cx_verdes),
    cx_amarelas: Math.max(0, cx_amarelas),
    cx_vermelhas: Math.max(0, cx_vermelhas),
    total_caixas,
    metros_estimados: Math.round(total_caixas * media),
  }
}
