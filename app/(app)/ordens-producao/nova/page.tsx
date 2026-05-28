import { createClient } from '@/lib/supabase/server'
import { getMesclas } from '@/lib/queries/ordens-producao'
import { NovaOPForm } from '@/components/ordens-producao/NovaOPForm'

export default async function NovaOPPage() {
  const supabase = await createClient()
  const [{ data: peliculas }, mesclas] = await Promise.all([
    supabase.from('peliculas').select('id, nome, largura, tonalidade, espessura').order('nome'),
    getMesclas(),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nova Ordem de Produção</h1>
      <NovaOPForm peliculas={peliculas ?? []} mesclas={mesclas} />
    </div>
  )
}
