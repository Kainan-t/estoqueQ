import { getPeliculaComHistorico } from '@/lib/queries/peliculas'
import { PeliculaDetail } from '@/components/peliculas/PeliculaDetail'
import { notFound } from 'next/navigation'

export default async function PeliculaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pelicula = await getPeliculaComHistorico(id)
  if (!pelicula) notFound()
  return <PeliculaDetail pelicula={pelicula} />
}
