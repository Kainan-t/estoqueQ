import { createClient } from '@/lib/supabase/server'
import type { RegistroCorte } from '@/types'

// Does NOT join ordens_producao via FK — avoids PostgREST schema-cache dependency
// for the newly-added ordem_producao_id column. OP info is fetched in a separate query.
const CORTE_SELECT = '*, produtos_finalizados(nome), profiles(nome)'

async function attachOPs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RegistroCorte[]
): Promise<RegistroCorte[]> {
  const ids = [...new Set(rows.map(r => r.ordem_producao_id).filter(Boolean))] as string[]
  if (ids.length === 0) return rows
  const { data: ops } = await supabase
    .from('ordens_producao')
    .select('id, numero')
    .in('id', ids)
  const opsMap = new Map((ops ?? []).map(op => [op.id, { numero: op.numero }]))
  return rows.map(r => ({
    ...r,
    ordens_producao: r.ordem_producao_id ? opsMap.get(r.ordem_producao_id) : undefined,
  }))
}

export async function getCortes(): Promise<RegistroCorte[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('movimentacoes_pf')
    .select(CORTE_SELECT)
    .eq('tipo', 'producao')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as RegistroCorte[]
  return attachOPs(supabase, rows)
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
  const rows = await attachOPs(supabase, [data as RegistroCorte])
  return rows[0] ?? null
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
