'use server'

import { createClient } from '@/lib/supabase/server'

export async function upsertStatusSetor(data: {
  op_id: string
  setor: 'quimico' | 'maquina' | 'corte'
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('status_setor')
    .upsert(
      {
        op_id: data.op_id,
        setor: data.setor,
        item_id: data.item_id,
        updated_at: new Date().toISOString(),
        usuario_id: user?.id ?? null,
      },
      { onConflict: 'op_id,setor' }
    )
  if (error) throw new Error(error.message)
}

export async function concluirOP(op_id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ordens_producao')
    .update({ status: 'concluida' })
    .eq('id', op_id)
  if (error) throw new Error(error.message)
}
