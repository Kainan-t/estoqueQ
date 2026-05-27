import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportMPToXLSX, exportPFToXLSX } from '@/lib/export'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tipo = searchParams.get('tipo') // 'mp' | 'pf'
  const inicio = searchParams.get('inicio')
  const fim = searchParams.get('fim')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (tipo === 'mp') {
    const { data: materias } = await supabase.from('materias_primas').select('id, nome')
    const { data: movs } = await supabase
      .from('movimentacoes_mp')
      .select('materia_prima_id, tipo, quantidade')
      .gte('data', inicio ?? '2000-01-01')
      .lte('data', fim ?? '2099-12-31')

    const rows = (materias ?? []).map((mp: any) => {
      const movsDoMp = (movs ?? []).filter((m: any) => m.materia_prima_id === mp.id)
      const entradas = movsDoMp.filter((m: any) => m.tipo === 'entrada').reduce((s: number, m: any) => s + m.quantidade, 0)
      const saidas = movsDoMp.filter((m: any) => m.tipo === 'saida').reduce((s: number, m: any) => s + m.quantidade, 0)
      return { nome: mp.nome, entradas, saidas, saldo: entradas - saidas, unidade: 'kg' }
    })

    const buffer = exportMPToXLSX(rows)
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-mp-${inicio}-${fim}.xlsx"`,
      },
    })
  }

  if (tipo === 'pf') {
    const { data: produtos } = await supabase.from('produtos_finalizados').select('id, nome')
    const { data: movs } = await supabase
      .from('movimentacoes_pf')
      .select('produto_id, tipo, cx_verdes, cx_amarelas, cx_vermelhas')
      .gte('data', inicio ?? '2000-01-01')
      .lte('data', fim ?? '2099-12-31')

    const rows = (produtos ?? []).map((pf: any) => {
      const movsDoPf = (movs ?? []).filter((m: any) => m.produto_id === pf.id)
      const prod = movsDoPf.filter((m: any) => m.tipo === 'producao')
      const exped = movsDoPf.filter((m: any) => m.tipo === 'expedicao')
      const total = (arr: any[]) => arr.reduce((s, m) => s + m.cx_verdes + m.cx_amarelas + m.cx_vermelhas, 0)
      const sumColor = (arr: any[], cor: string) => arr.reduce((s, m) => s + m[cor], 0)
      return {
        nome: pf.nome,
        produzido: total(prod),
        expedido: total(exped),
        saldo_verde: sumColor(prod, 'cx_verdes') - sumColor(exped, 'cx_verdes'),
        saldo_amarelo: sumColor(prod, 'cx_amarelas') - sumColor(exped, 'cx_amarelas'),
        saldo_vermelho: sumColor(prod, 'cx_vermelhas') - sumColor(exped, 'cx_vermelhas'),
      }
    })

    const buffer = exportPFToXLSX(rows)
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-pf-${inicio}-${fim}.xlsx"`,
      },
    })
  }

  return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
}
