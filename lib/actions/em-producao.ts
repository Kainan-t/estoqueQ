'use server'

import { createClient } from '@/lib/supabase/server'
import type { Setor } from '@/types'

export async function upsertStatusSetor(data: {
  op_id: string
  setor: Setor
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('cargo, setor')
    .eq('id', user.id)
    .single()

  if (profile?.cargo !== 'admin' && profile?.setor !== data.setor) {
    throw new Error('Sem permissão para editar este setor')
  }

  const { error } = await supabase
    .from('status_setor')
    .upsert(
      {
        op_id: data.op_id,
        setor: data.setor,
        item_id: data.item_id,
        updated_at: new Date().toISOString(),
        usuario_id: user.id,
      },
      { onConflict: 'op_id,setor' }
    )
  if (error) throw new Error(error.message)
}

export async function concluirOP(op_id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (profile?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem concluir OPs')
  }

  const { error } = await supabase
    .from('ordens_producao')
    .update({ status: 'concluida' })
    .eq('id', op_id)
  if (error) throw new Error(error.message)
}
