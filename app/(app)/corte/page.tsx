import { getCortes } from '@/lib/queries/corte'
import { CorteList } from '@/components/corte/CorteList'

export default async function CortePage() {
  const cortes = await getCortes()
  return (
    <div className="space-y-6">
      <CorteList cortes={cortes} />
    </div>
  )
}
