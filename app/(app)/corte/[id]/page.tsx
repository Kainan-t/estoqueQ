import { notFound } from 'next/navigation'
import { getCorte } from '@/lib/queries/corte'
import { CorteDetail } from '@/components/corte/CorteDetail'

export default async function CorteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const corte = await getCorte(id)
  if (!corte) notFound()
  return (
    <div className="space-y-6">
      <CorteDetail corte={corte} />
    </div>
  )
}
