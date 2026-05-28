import { createClient } from '@/lib/supabase/server'
import { calcularSaldoPelicula } from '@/lib/calculations'
import type { Pelicula, PeliculaComSaldo, MovimentacaoPelicula } from '@/types'

export async function getPeliculasComSaldo(): Promise<PeliculaComSaldo[]> {
  const supabase = await createClient()
  const { data: peliculas } = await supabase
    .from('peliculas')
    .select('*')
    .order('nome')

  if (!peliculas) return []

  const { data: movs } = await supabase
    .from('movimentacoes_pelicula')
    .select('pelicula_id, tipo, quantidade_metros')

  return peliculas.map((p: Pelicula) => {
    const movsDaP = (movs ?? []).filter((m: any) => m.pelicula_id === p.id)
    const saldo = calcularSaldoPelicula(movsDaP as MovimentacaoPelicula[])
    return { ...p, saldo, em_alerta: saldo <= p.estoque_minimo }
  })
}

export async function getPeliculaComHistorico(id: string): Promise<(PeliculaComSaldo & { movimentacoes: MovimentacaoPelicula[] }) | null> {
  const supabase = await createClient()
  const [{ data: pelicula }, { data: movs }] = await Promise.all([
    supabase.from('peliculas').select('*').eq('id', id).single(),
    supabase.from('movimentacoes_pelicula')
      .select('*, profiles(nome)')
      .eq('pelicula_id', id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (!pelicula) return null
  const saldo = calcularSaldoPelicula((movs ?? []) as MovimentacaoPelicula[])
  return { ...pelicula, saldo, em_alerta: saldo <= pelicula.estoque_minimo, movimentacoes: movs ?? [] }
}

export async function registrarMovimentacaoPelicula(data: {
  pelicula_id: string
  tipo: 'entrada' | 'saida'
  quantidade_metros: number
  data: string
  usuario_id: string
  observacao?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('movimentacoes_pelicula').insert(data)
  if (error) throw new Error(error.message)
}
