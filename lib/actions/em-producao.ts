'use server'

import { createClient } from '@/lib/supabase/server'
import type { Setor } from '@/types'

async function exigirMaquinaOuAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cargo, setor')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil de usuário não encontrado')
  if (profile.cargo !== 'admin' && profile.setor !== 'maquina') {
    throw new Error('Sem permissão para registrar lotes')
  }
  return { supabase, user }
}

export async function upsertStatusSetor(data: {
  op_id: string
  setor: Setor
  item_id: string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cargo, setor')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil de usuário não encontrado')

  if (profile.cargo !== 'admin' && profile.setor !== data.setor) {
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil de usuário não encontrado')

  if (profile.cargo !== 'admin') {
    throw new Error('Apenas administradores podem concluir OPs')
  }

  const { error } = await supabase
    .from('ordens_producao')
    .update({ status: 'concluida' })
    .eq('id', op_id)
  if (error) throw new Error(error.message)
}

export async function criarLote(data: {
  op_id: string
  item_id: string
  numero: string
  metragem: number
}): Promise<void> {
  const { supabase, user } = await exigirMaquinaOuAdmin()

  const numero = data.numero.trim()
  if (!numero) throw new Error('Número do lote é obrigatório')
  if (!(data.metragem > 0)) throw new Error('Metragem deve ser maior que zero')

  const { data: item, error: itemError } = await supabase
    .from('ordens_producao_itens')
    .select('pelicula_id')
    .eq('id', data.item_id)
    .single()
  if (itemError || !item || !item.pelicula_id) {
    throw new Error('Item de película não encontrado')
  }

  const { error } = await supabase.from('lotes_producao').insert({
    op_id: data.op_id,
    item_id: data.item_id,
    pelicula_id: item.pelicula_id,
    numero,
    metragem: data.metragem,
    usuario_id: user.id,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Número de lote já existe')
    throw new Error(error.message)
  }
}

export async function atualizarLote(data: {
  id: string
  numero: string
  metragem: number
}): Promise<void> {
  const { supabase } = await exigirMaquinaOuAdmin()

  const numero = data.numero.trim()
  if (!numero) throw new Error('Número do lote é obrigatório')
  if (!(data.metragem > 0)) throw new Error('Metragem deve ser maior que zero')

  const { error } = await supabase
    .from('lotes_producao')
    .update({ numero, metragem: data.metragem })
    .eq('id', data.id)
  if (error) {
    if (error.code === '23505') throw new Error('Número de lote já existe')
    throw new Error(error.message)
  }
}

export async function excluirLote(id: string): Promise<void> {
  const { supabase } = await exigirMaquinaOuAdmin()
  const { error } = await supabase.from('lotes_producao').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
