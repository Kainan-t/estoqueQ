import { getOPsEmProducao } from '@/lib/queries/em-producao'
import { EmProducaoList } from '@/components/em-producao/EmProducaoList'

export default async function EmProducaoPage() {
  const ops = await getOPsEmProducao()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏭 Em Produção</h1>
        <p className="text-sm text-muted-foreground">
          Status em tempo real por setor — atualize ao recarregar a página
        </p>
      </div>
      <EmProducaoList ops={ops} />
    </div>
  )
}
