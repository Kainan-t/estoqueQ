import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOPsEmProducao } from '@/lib/queries/em-producao'
import { EmProducaoList } from '@/components/em-producao/EmProducaoList'
import type { Cargo, Setor } from '@/types'

export default async function EmProducaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ops, { data: perfil }] = await Promise.all([
    getOPsEmProducao(),
    supabase.from('profiles').select('cargo, setor').eq('id', user.id).single(),
  ])

  const meuCargo: Cargo = perfil?.cargo ?? 'operador'
  const meuSetor: Setor | null = perfil?.setor ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏭 Em Produção</h1>
        <p className="text-sm text-muted-foreground">
          Status em tempo real por setor — atualize ao recarregar a página
        </p>
      </div>
      <EmProducaoList ops={ops} meuCargo={meuCargo} meuSetor={meuSetor} />
    </div>
  )
}
