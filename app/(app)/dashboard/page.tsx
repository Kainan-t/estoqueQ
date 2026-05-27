import { createClient } from '@/lib/supabase/server'
import { getMateriasComSaldo } from '@/lib/queries/materias-primas'
import { getProdutosComSaldo } from '@/lib/queries/produtos-finalizados'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { StockAlerts } from '@/components/dashboard/StockAlerts'
import { RecentMovements } from '@/components/dashboard/RecentMovements'

export default async function DashboardPage() {
  const [materias, produtos] = await Promise.all([
    getMateriasComSaldo(),
    getProdutosComSaldo(),
  ])

  const supabase = await createClient()

  const [{ data: movsMp }, { data: movsPf }] = await Promise.all([
    supabase
      .from('movimentacoes_mp')
      .select('*, profiles(nome), materias_primas(nome)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('movimentacoes_pf')
      .select('*, profiles(nome), produtos_finalizados(nome)')
      .order('created_at', { ascending: false })
      .limit(5),
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

  const allRecent = [...recentMP, ...recentPF]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const alertas = materias.filter(m => m.em_alerta).length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <SummaryCards totalMP={materias.length} totalPF={produtos.length} alertas={alertas} />
      <StockAlerts materias={materias} />
      <RecentMovements movements={allRecent as any} />
    </div>
  )
}
