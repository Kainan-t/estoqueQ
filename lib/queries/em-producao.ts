import { createClient } from '@/lib/supabase/server'
import type { OPEmProducao, StatusSetorRow, ItemEnriquecido, LoteProducao } from '@/types'

export async function getOPsEmProducao(): Promise<OPEmProducao[]> {
  const supabase = await createClient()

  // 1. OPs emitidas
  const { data: ops, error } = await supabase
    .from('ordens_producao')
    .select('id, numero, emitida_at')
    .eq('status', 'emitida')
    .order('emitida_at', { ascending: false })
  if (error) throw new Error(error.message)
  if (!ops || ops.length === 0) return []

  const opIds = ops.map(op => op.id)

  // 2. Itens das OPs
  const { data: itensRaw } = await supabase
    .from('ordens_producao_itens')
    .select('id, ordem_id, pelicula_id, mescla_id, quantidade')
    .in('ordem_id', opIds)

  const itens = itensRaw ?? []

  // 3. Nomes e códigos das películas
  const pelIds = [...new Set(itens.map((i: any) => i.pelicula_id).filter(Boolean))]
  const { data: pelRaw } = pelIds.length
    ? await supabase.from('peliculas').select('id, nome, codigo').in('id', pelIds)
    : { data: [] }
  const pelMap = new Map(
    (pelRaw ?? []).map((p: any) => [p.id, { nome: p.nome as string, codigo: (p.codigo ?? null) as string | null }])
  )

  // 4. Nomes das mesclas
  const mesclaIds = [...new Set(itens.map((i: any) => i.mescla_id).filter(Boolean))]
  const { data: mesclaRaw } = mesclaIds.length
    ? await supabase.from('mesclas').select('id, nome').in('id', mesclaIds)
    : { data: [] }
  const mesclaMap = new Map((mesclaRaw ?? []).map((m: any) => [m.id, m.nome as string]))

  // 5. Status de cada setor por OP
  const { data: statusRaw } = await supabase
    .from('status_setor')
    .select('*')
    .in('op_id', opIds)

  // 6. Lotes de produção das OPs
  const { data: lotesRaw } = await supabase
    .from('lotes_producao')
    .select('id, op_id, item_id, pelicula_id, numero, metragem, usuario_id, created_at')
    .in('op_id', opIds)

  // 7. Nomes dos autores (status_setor + lotes)
  const usuarioIds = [...new Set([
    ...(statusRaw ?? []).map((s: any) => s.usuario_id),
    ...(lotesRaw ?? []).map((l: any) => l.usuario_id),
  ].filter(Boolean))] as string[]
  const { data: perfisRaw } = usuarioIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', usuarioIds)
    : { data: [] }
  const perfisMap = new Map((perfisRaw ?? []).map((p: any) => [p.id, p.nome as string]))

  // Montar resultado
  return ops.map(op => ({
    id: op.id,
    numero: op.numero,
    emitida_at: op.emitida_at ?? '',
    itens: itens
      .filter((i: any) => i.ordem_id === op.id)
      .map((i: any): ItemEnriquecido => ({
        id: i.id,
        ordem_id: i.ordem_id,
        pelicula_id: i.pelicula_id ?? null,
        mescla_id: i.mescla_id ?? null,
        quantidade: i.quantidade,
        peliculas: i.pelicula_id
          ? {
              nome: pelMap.get(i.pelicula_id)?.nome ?? '',
              codigo: pelMap.get(i.pelicula_id)?.codigo ?? null,
            }
          : undefined,
        mesclas: i.mescla_id ? { nome: mesclaMap.get(i.mescla_id) ?? '' } : undefined,
      })),
    statusSetor: (statusRaw ?? [])
      .filter((s: any) => s.op_id === op.id)
      .map((s: any): StatusSetorRow => ({
        id: s.id,
        op_id: s.op_id,
        setor: s.setor,
        item_id: s.item_id,
        updated_at: s.updated_at,
        usuario_id: s.usuario_id ?? null,
        usuario_nome: s.usuario_id ? (perfisMap.get(s.usuario_id) ?? null) : null,
      })),
    lotes: (lotesRaw ?? [])
      .filter((l: any) => l.op_id === op.id)
      .map((l: any): LoteProducao => ({
        id: l.id,
        op_id: l.op_id,
        item_id: l.item_id,
        pelicula_id: l.pelicula_id,
        numero: l.numero,
        metragem: Number(l.metragem),
        usuario_id: l.usuario_id ?? null,
        usuario_nome: l.usuario_id ? (perfisMap.get(l.usuario_id) ?? null) : null,
        created_at: l.created_at,
      })),
  }))
}
