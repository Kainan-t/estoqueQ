import { createClient } from '@/lib/supabase/server'
import type { RegistroCorte } from '@/types'

const CORTE_SELECT = '*, produtos_finalizados(nome), ordens_producao(numero), profiles(nome)'

export async function getCortes(): Promise<RegistroCorte[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes_pf')
    .select(CORTE_SELECT)
    .eq('tipo', 'producao')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RegistroCorte[]
}

export async function getCorte(id: string): Promise<RegistroCorte | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes_pf')
    .select(CORTE_SELECT)
    .eq('id', id)
    .eq('tipo', 'producao')
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as RegistroCorte
}

export async function getOPsEmitidas(): Promise<{ id: string; numero: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordens_producao')
    .select('id, numero')
    .eq('status', 'emitida')
    .order('numero')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProdutosParaCorte(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produtos_finalizados')
    .select('id, nome')
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}
