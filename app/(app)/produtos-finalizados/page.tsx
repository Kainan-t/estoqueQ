import { getProdutosComSaldo } from '@/lib/queries/produtos-finalizados'
import { PFList } from '@/components/produtos-finalizados/PFList'

export default async function ProdutosFinalizadosPage() {
  const produtos = await getProdutosComSaldo()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Produtos Finalizados</h1>
      <PFList produtos={produtos} />
    </div>
  )
}
