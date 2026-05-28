import { createClient } from '@/lib/supabase/server'
import type { OrdemProducaoComItens, Mescla } from '@/types'

const ITENS_SELECT = '*, peliculas(nome,largura,tonalidade,espessura), materias_primas(nome,unidade), mesclas(nome)'
const OP_SELECT = `*, ordens_producao_itens(${ITENS_SELECT})`

export async function getOrdensProducao(): Promise<OrdemProducaoComItens[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordens_producao')
    .select(OP_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((op: any) => ({ ...op, itens: op.ordens_producao_itens ?? [] }))
}

export async function getOrdemProducao(id: string): Promise<OrdemProducaoComItens | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordens_producao')
    .select(OP_SELECT)
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return { ...data, itens: data.ordens_producao_itens ?? [] }
}

export async function getMesclas(): Promise<Mescla[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mesclas')
    .select('*, mescla_ingredientes(*, materias_primas(nome,unidade))')
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}
