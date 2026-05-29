import { createClient } from '@/lib/supabase/server'
import type { RegistroCorte } from '@/types'

// No PostgREST relational joins — all related data fetched via separate .in() queries.
// This avoids schema-cache issues after the ordem_producao_id FK was added.
const CORTE_SELECT = '*'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function enrichCortes(
  supabase: SupabaseClient,
  rows: RegistroCorte[]
): Promise<RegistroCorte[]> {
  if (rows.length === 0) return rows

  // Produto names
  const produtoIds = [...new Set(rows.map(r => r.produto_id).filter(Boolean))] as string[]
  const { data: produtos } = await supabase
    .from('produtos_finalizados')
    .select('id, nome')
    .in('id', produtoIds)
  const prodMap = new Map((produtos ?? []).map(p => [p.id, { nome: p.nome }]))

  // OP numbers
  const opIds = [...new Set(rows.map(r => r.ordem_producao_id).filter(Boolean))] as string[]
  const opsMap = new Map<string, { numero: string }>()
  if (opIds.length > 0) {
    const { data: ops } = await supabase
      .from('ordens_producao')
      .select('id, numero')
      .in('id', opIds)
    for (const op of ops ?? []) opsMap.set(op.id, { numero: op.numero })
  }

  // Operator names
  const userIds = [...new Set(rows.map(r => r.usuario_id).filter(Boolean))] as string[]
  const profilesMap = new Map<string, { nome: string }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', userIds)
    for (const p of profiles ?? []) profilesMap.set(p.id, { nome: p.nome })
  }

  return rows.map(r => ({
    ...r,
    produtos_finalizados: prodMap.get(r.produto_id),
    ordens_producao: r.ordem_producao_id ? opsMap.get(r.ordem_producao_id) : undefined,
    profiles: profilesMap.get(r.usuario_id),
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
