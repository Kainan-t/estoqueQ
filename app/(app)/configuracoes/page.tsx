import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('cargo').eq('id', user.id).single()

  if (profile?.cargo !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">Apenas administradores podem acessar esta área.</p>
      </div>
    )
  }

  const [{ data: materias }, { data: qualidade }, { data: usuarios }] = await Promise.all([
    supabase.from('materias_primas').select('id, nome, estoque_minimo').order('nome'),
    supabase.from('configuracoes_qualidade').select('*'),
    supabase.from('profiles').select('id, nome, cargo').order('nome'),
  ])

  return (
    <ConfiguracoesClient
      materias={materias ?? []}
      qualidade={qualidade ?? []}
      usuarios={usuarios ?? []}
    />
  )
}
