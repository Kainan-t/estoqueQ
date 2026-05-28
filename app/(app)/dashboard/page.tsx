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
    { data: movsMp },
    { data: movsPf },
    { data: movsPelicula },
    { data: opsAll },
    { data: opsRecentes },
  ] = await Promise.all([
    supabase
      .from('movimentacoes_mp')
      .select('*, profiles(nome), materias_primas(nome)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('movimentacoes_pf')
      .select('*, profiles(nome), produtos_finalizados(nome)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('movimentacoes_pelicula')
      .select('*, profiles(nome), peliculas(nome)')
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

  const recentMP = (movsMp ?? []).map((m: any) => ({
    ...m,
    kind: 'mp' as const,
    nome_material: m.materias_primas?.nome ?? '',
  }))

  const recentPF = (movsPf ?? []).map((m: any) => ({
    ...m,
    kind: 'pf' as const,
    nome_produto: m.produtos_finalizados?.nome ?? '',
  }))

  const recentPelicula = (movsPelicula ?? []).map((m: any) => ({
    ...m,
    kind: 'pelicula' as const,
    nome_material: m.peliculas?.nome ?? '',
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
