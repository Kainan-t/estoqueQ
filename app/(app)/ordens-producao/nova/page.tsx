import { createClient } from '@/lib/supabase/server'
import { NovaOPForm } from '@/components/ordens-producao/NovaOPForm'

export default async function NovaOPPage() {
  const supabase = await createClient()
  const [{ data: peliculas }, { data: materias }] = await Promise.all([
    supabase.from('peliculas').select('id, nome, largura, tonalidade, espessura').order('nome'),
    supabase.from('materias_primas').select('id, nome, unidade').order('nome'),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Ordem de Produção</h1>
      <NovaOPForm peliculas={peliculas ?? []} materias={materias ?? []} />
    </div>
  )
}
