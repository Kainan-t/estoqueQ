import { createClient } from '@/lib/supabase/server'
import { getMateriasComSaldo } from '@/lib/queries/materias-primas'
import { getProdutosComSaldo } from '@/lib/queries/produtos-finalizados'
import { getPeliculasComSaldo } from '@/lib/queries/peliculas'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { StockAlerts } from '@/components/dashboard/StockAlerts'
import { RecentMovements } from '@/components/dashboard/RecentMovements'
import { RecentOPs } from '@/components/dashboard/RecentOPs'
import { StockOverview } from '@/components/dashboard/StockOverview'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [materias, produtos, peliculas] = await Promise.all([
    getMateriasComSaldo(),
    getProdutosComSaldo(),
    getPeliculasComSaldo(),
  ])

  const [
    { data: movsPfRaw },
    { data: movsPeliculaRaw },
    { data: opsAll },
    { data: opsRecentes },
    { data: opsEmitidas },
  ] = await Promise.all([
    supabase
      .from('movimentacoes_pf')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('movimentacoes_pelicula')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6),
    // All OPs (lightweight) for accurate status counts
    supabase.from('ordens_producao').select('id, status'),
    // Recent OPs for the detail list
    supabase
      .from('ordens_producao')
      .select('id, numero, status, created_at, emitida_at, observacao')
      .order('created_at', { ascending: false })
      .limit(6),
    // Recently emitted OPs for mescla consumption entries
    supabase
      .from('ordens_producao')
      .select('id, emitida_at')
      .eq('status', 'emitida')
      .not('emitida_at', 'is', null)
      .order('emitida_at', { ascending: false })
      .limit(6),
  ])

  // --- Mescla consumptions from emitted OP items ---
  const emitidaIds = (opsEmitidas ?? []).map((op: any) => op.id)
  const emitidaAtMap = new Map((opsEmitidas ?? []).map((op: any) => [op.id, op.emitida_at]))

  const { data: mesclaItens } = emitidaIds.length
    ? await supabase
        .from('ordens_producao_itens')
        .select('id, ordem_id, mescla_id')
        .in('ordem_id', emitidaIds)
        .not('mescla_id', 'is', null)
    : { data: [] }

  const mesclaIds = [...new Set((mesclaItens ?? []).map((i: any) => i.mescla_id).filter(Boolean))]
  const { data: mesclaNames } = mesclaIds.length
    ? await supabase.from('mesclas').select('id, nome').in('id', mesclaIds)
    : { data: [] }
  const mesclaMap = new Map((mesclaNames ?? []).map((m: any) => [m.id, m.nome]))

  // One entry per (op, mescla) — already deduplicated by item
  const recentMescla = (mesclaItens ?? []).map((item: any) => ({
    id: item.id,
    kind: 'mp' as const,
    tipo: 'saida' as const,
    nome_material: mesclaMap.get(item.mescla_id) ?? 'Mescla',
    quantidade: 0,
    data: emitidaAtMap.get(item.ordem_id) ?? '',
    created_at: emitidaAtMap.get(item.ordem_id) ?? '',
  }))

  // --- Película movements ---
  const pelIds = [...new Set((movsPeliculaRaw ?? []).map((m: any) => m.pelicula_id).filter(Boolean))]
  const { data: pelNomes } = pelIds.length
    ? await supabase.from('peliculas').select('id, nome').in('id', pelIds)
    : { data: [] }
  const pelNomesMap = new Map((pelNomes ?? []).map((r: any) => [r.id, r.nome]))

  const recentPelicula = (movsPeliculaRaw ?? []).map((m: any) => ({
    ...m,
    kind: 'pelicula' as const,
    nome_material: pelNomesMap.get(m.pelicula_id) ?? '',
  }))

  // --- PF movements ---
  const pfIds = [...new Set((movsPfRaw ?? []).map((m: any) => m.produto_id).filter(Boolean))]
  const { data: pfNomes } = pfIds.length
    ? await supabase.from('produtos_finalizados').select('id, nome').in('id', pfIds)
    : { data: [] }
  const pfNomesMap = new Map((pfNomes ?? []).map((r: any) => [r.id, r.nome]))

  const recentPF = (movsPfRaw ?? []).map((m: any) => ({
    ...m,
    kind: 'pf' as const,
    nome_produto: pfNomesMap.get(m.produto_id) ?? '',
  }))

  const allRecent = [...recentMescla, ...recentPelicula, ...recentPF]
    .filter(m => m.data)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const alertasMP = materias.filter(m => m.em_alerta).length
  const alertasPelicula = peliculas.filter(p => p.em_alerta).length
  const totalCaixas = produtos.reduce((sum, p) => sum + p.saldo.total_caixas, 0)
  const opsRascunho = (opsAll ?? []).filter((op: any) => op.status === 'rascunho').length
  const opsEmitidasCount = (opsAll ?? []).filter((op: any) => op.status === 'emitida').length

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <SummaryCards
        totalMP={materias.length}
        alertasMP={alertasMP}
        totalPelicula={peliculas.length}
        alertasPelicula={alertasPelicula}
        totalPF={produtos.length}
        totalCaixas={totalCaixas}
        opsRascunho={opsRascunho}
        opsEmitidas={opsEmitidasCount}
      />

      <StockAlerts materias={materias} peliculas={peliculas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOPs ops={(opsRecentes ?? []) as any} />
        <RecentMovements movements={allRecent as any} />
      </div>

      <StockOverview materias={materias} peliculas={peliculas} />
    </div>
  )
}
