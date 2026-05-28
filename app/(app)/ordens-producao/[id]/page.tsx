import { notFound } from 'next/navigation'
import { getOrdemProducao } from '@/lib/queries/ordens-producao'
import { OPDetail } from '@/components/ordens-producao/OPDetail'

export default async function OrdemProducaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ordem = await getOrdemProducao(id)
  if (!ordem) notFound()
  return (
    <div className="space-y-6">
      <OPDetail ordem={ordem} />
    </div>
  )
}
