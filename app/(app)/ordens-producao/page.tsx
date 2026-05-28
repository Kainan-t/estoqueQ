import { getOrdensProducao } from '@/lib/queries/ordens-producao'
import { OPList } from '@/components/ordens-producao/OPList'

export default async function OrdensProducaoPage() {
  const ordens = await getOrdensProducao()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ordens de Produção</h1>
      <OPList ordens={ordens} />
    </div>
  )
}
