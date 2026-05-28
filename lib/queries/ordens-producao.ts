import { createClient } from '@/lib/supabase/server'
import type { OrdemProducaoComItens } from '@/types'

export async function getOrdensProducao(): Promise<OrdemProducaoComItens[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ordens_producao')
    .select('*, profiles(nome), ordens_producao_itens(*, peliculas(nome,largura,tonalidade,espessura), materias_primas(nome,unidade))')
    .order('created_at', { ascending: false })
  return (data ?? []).map((op: any) => ({ ...op, itens: op.ordens_producao_itens ?? [] }))
}

export async function getOrdemProducao(id: string): Promise<OrdemProducaoComItens | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ordens_producao')
    .select('*, profiles(nome), ordens_producao_itens(*, peliculas(nome,largura,tonalidade,espessura), materias_primas(nome,unidade))')
    .eq('id', id)
    .single()
  if (!data) return null
  return { ...data, itens: data.ordens_producao_itens ?? [] }
}
