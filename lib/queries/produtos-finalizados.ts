import { createClient } from '@/lib/supabase/server'
import { calcularSaldoPF } from '@/lib/calculations'
import type { ProdutoFinalizado, ProdutoFinalizadoComSaldo, MovimentacaoPF } from '@/types'

export async function getProdutosComSaldo(): Promise<ProdutoFinalizadoComSaldo[]> {
  const supabase = await createClient()
  const { data: produtos } = await supabase
    .from('produtos_finalizados')
    .select('*')
    .order('nome')

  if (!produtos) return []

  const { data: movs } = await supabase
    .from('movimentacoes_pf')
    .select('produto_id, tipo, metros_por_caixa, cx_verdes, cx_amarelas, cx_vermelhas')

  return produtos.map((pf: ProdutoFinalizado) => {
    const movsDoPf = (movs ?? []).filter((m: any) => m.produto_id === pf.id)
    const saldo = calcularSaldoPF(movsDoPf as MovimentacaoPF[])
    return { ...pf, saldo }
  })
}

export async function getProdutoComHistorico(id: string) {
  const supabase = await createClient()
  const { data: pf } = await supabase
    .from('produtos_finalizados')
    .select('*')
    .eq('id', id)
    .single()

  const { data: movs } = await supabase
    .from('movimentacoes_pf')
    .select('*, profiles(nome)')
    .eq('produto_id', id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (!pf) return null
  const saldo = calcularSaldoPF((movs ?? []) as MovimentacaoPF[])
  return { ...pf, saldo, movimentacoes: movs ?? [] }
}

export async function registrarMovimentacaoPF(data: {
  produto_id: string
  tipo: 'producao' | 'expedicao'
  metros_por_caixa?: number | null
  cx_verdes: number
  cx_amarelas: number
  cx_vermelhas: number
  data: string
  usuario_id: string
  observacao?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('movimentacoes_pf').insert(data)
  if (error) throw new Error(error.message)
}
