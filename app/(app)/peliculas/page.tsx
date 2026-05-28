import { getPeliculasComSaldo } from '@/lib/queries/peliculas'
import { PeliculaList } from '@/components/peliculas/PeliculaList'

export default async function PeliculasPage() {
  const peliculas = await getPeliculasComSaldo()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Películas</h1>
      <PeliculaList peliculas={peliculas} />
    </div>
  )
}
