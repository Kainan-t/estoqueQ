import { createClient } from '@/lib/supabase/server'
import { calcularSaldoMP } from '@/lib/calculations'
import type { MateriaPrima, MateriaPrimaComSaldo, MovimentacaoMP } from '@/types'

export async function getMateriasComSaldo(): Promise<MateriaPrimaComSaldo[]> {
  const supabase = await createClient()
  const { data: materias } = await supabase
    .from('materias_primas')
    .select('*')
    .order('nome')

  if (!materias) return []

  const { data: movs } = await supabase
    .from('movimentacoes_mp')
    .select('materia_prima_id, tipo, quantidade')

  return materias.map((mp: MateriaPrima) => {
    const movsDoMp = (movs ?? []).filter((m: any) => m.materia_prima_id === mp.id)
    const saldo = calcularSaldoMP(movsDoMp as MovimentacaoMP[])
    return { ...mp, saldo, em_alerta: saldo <= mp.estoque_minimo } // alert fires at or below minimum (intentional <=)
  })
}

export async function getMateriaPrimaComHistorico(id: string) {
  const supabase = await createClient()
  const [{ data: mp }, { data: movs }] = await Promise.all([
    supabase.from('materias_primas').select('*').eq('id', id).single(),
    supabase
      .from('movimentacoes_mp')
      .select('*, profiles(nome)')
      .eq('materia_prima_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (!mp) return null
  const saldo = calcularSaldoMP((movs ?? []) as MovimentacaoMP[])
  return {
    ...mp,
    saldo,
    em_alerta: saldo <= mp.estoque_minimo, // alert fires at or below minimum (intentional <=)
    movimentacoes: movs ?? [],
  }
}

export async function registrarMovimentacaoMP(data: {
  materia_prima_id: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  data: string
  usuario_id: string
  observacao?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('movimentacoes_mp').insert(data)
  if (error) throw new Error(error.message)
}
