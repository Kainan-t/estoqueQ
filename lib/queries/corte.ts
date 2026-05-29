import { createClient } from '@/lib/supabase/server'
import type { RegistroCorte } from '@/types'

// Only join 'profiles' — the only confirmed FK on movimentacoes_pf.
// 'produtos_finalizados' and 'ordens_producao' are fetched via separate queries
// to avoid PostgREST "Could not find a relationship" errors.
const CORTE_SELECT = '*, profiles(nome)'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function enrichCortes(
  supabase: SupabaseClient,
  rows: RegistroCorte[]
): Promise<RegistroCorte[]> {
  if (rows.length === 0) return rows

  // Fetch produto names
  const produtoIds = [...new Set(rows.map(r => r.produto_id).filter(Boolean))] as string[]
  const { data: produtos } = await supabase
    .from('produtos_finalizados')
    .select('id, nome')
    .in('id', produtoIds)
  const prodMap = new Map((produtos ?? []).map(p => [p.id, { nome: p.nome }]))

  // Fetch OP numbers
  const opIds = [...new Set(rows.map(r => r.ordem_producao_id).filter(Boolean))] as string[]
  const opsMap = new Map<string, { numero: string }>()
  if (opIds.length > 0) {
    const { data: ops } = await supabase
      .from('ordens_producao')
      .select('id, numero')
      .in('id', opIds)
    for (const op of ops ?? []) opsMap.set(op.id, { numero: op.numero })
  }

  return rows.map(r => ({
    ...r,
    produtos_finalizados: prodMap.get(r.produto_id),
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
  return enrichCortes(supabase, (data ?? []) as RegistroCorte[])
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
  const rows = await enrichCortes(supabase, [data as RegistroCorte])
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
