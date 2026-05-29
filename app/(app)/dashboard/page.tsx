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
    { data: movsMpRaw },
    { data: movsPfRaw },
    { data: movsPeliculaRaw },
    { data: opsAll },
    { data: opsRecentes },
  ] = await Promise.all([
    supabase
      .from('movimentacoes_mp')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6),
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
  ])

  // Enrich MP movements with material names
  const mpIds = [...new Set((movsMpRaw ?? []).map((m: any) => m.materia_prima_id).filter(Boolean))]
  const { data: mpNomes } = mpIds.length
    ? await supabase.from('materias_primas').select('id, nome').in('id', mpIds)
    : { data: [] }
  const mpNomesMap = new Map((mpNomes ?? []).map((r: any) => [r.id, r.nome]))

  // Enrich PF movements with product names
  const pfIds = [...new Set((movsPfRaw ?? []).map((m: any) => m.produto_id).filter(Boolean))]
  const { data: pfNomes } = pfIds.length
    ? await supabase.from('produtos_finalizados').select('id, nome').in('id', pfIds)
    : { data: [] }
  const pfNomesMap = new Map((pfNomes ?? []).map((r: any) => [r.id, r.nome]))

  // Enrich película movements with película names
  const pelIds = [...new Set((movsPeliculaRaw ?? []).map((m: any) => m.pelicula_id).filter(Boolean))]
  const { data: pelNomes } = pelIds.length
    ? await supabase.from('peliculas').select('id, nome').in('id', pelIds)
    : { data: [] }
  const pelNomesMap = new Map((pelNomes ?? []).map((r: any) => [r.id, r.nome]))

  const recentMP = (movsMpRaw ?? []).map((m: any) => ({
    ...m,
    kind: 'mp' as const,
    nome_material: mpNomesMap.get(m.materia_prima_id) ?? '',
  }))

  const recentPF = (movsPfRaw ?? []).map((m: any) => ({
    ...m,
    kind: 'pf' as const,
    nome_produto: pfNomesMap.get(m.produto_id) ?? '',
  }))

  const recentPelicula = (movsPeliculaRaw ?? []).map((m: any) => ({
    ...m,
    kind: 'pelicula' as const,
    nome_material: pelNomesMap.get(m.pelicula_id) ?? '',
  }))

  const allRecent = [...recentMP, ...recentPF, ...recentPelicula]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  const alertasMP = materias.filter(m => m.em_alerta).length
  const alertasPelicula = peliculas.filter(p => p.em_alerta).length
  const totalCaixas = produtos.reduce((sum, p) => sum + p.saldo.total_caixas, 0)
  const opsRascunho = (opsAll ?? []).filter((op: any) => op.status === 'rascunho').length
  const opsEmitidas = (opsAll ?? []).filter((op: any) => op.status === 'emitida').length

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
        opsEmitidas={opsEmitidas}
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
