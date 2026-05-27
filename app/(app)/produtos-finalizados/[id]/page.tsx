import { getProdutoComHistorico } from '@/lib/queries/produtos-finalizados'
import { PFDetail } from '@/components/produtos-finalizados/PFDetail'
import { notFound } from 'next/navigation'

export default async function ProdutoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getProdutoComHistorico(id)
  if (!data) notFound()
  const { movimentacoes, ...produto } = data
  return <PFDetail produto={produto} movimentacoes={movimentacoes} />
}
