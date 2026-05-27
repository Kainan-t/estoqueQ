import { getMateriasComSaldo } from '@/lib/queries/materias-primas'
import { MPList } from '@/components/materias-primas/MPList'

export default async function MateriasPrimasPage() {
  const materias = await getMateriasComSaldo()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Matérias-Primas</h1>
      <MPList materias={materias} />
    </div>
  )
}
