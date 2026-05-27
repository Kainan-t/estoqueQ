import { getMateriaPrimaComHistorico } from '@/lib/queries/materias-primas'
import { MPDetail } from '@/components/materias-primas/MPDetail'
import { notFound } from 'next/navigation'

export default async function MateriaPrimaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const mp = await getMateriaPrimaComHistorico(id)
  if (!mp) notFound()
  return <MPDetail mp={mp} />
}
