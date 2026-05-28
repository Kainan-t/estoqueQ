'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from './StatusBadge'
import type { OrdemProducaoComItens } from '@/types'

interface Props {
  ordem: OrdemProducaoComItens
}

export function OPDetail({ ordem }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'emitir' | 'cancelar' | null>(null)
  const [error, setError] = useState('')

  async function handleEmitir() {
    setError('')
    setLoading('emitir')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada.'); return }
      const { error } = await supabase.rpc('emitir_ordem_producao', {
        p_ordem_id: ordem.id,
        p_usuario_id: user.id,
      })
      if (error) { setError(error.message); return }
      router.refresh()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  async function handleCancelar() {
    if (!window.confirm('Confirmar cancelamento desta ordem de produção? Esta ação não pode ser desfeita.')) return
    setError('')
    setLoading('cancelar')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sessão expirada.'); return }
      const { error } = await supabase.rpc('cancelar_ordem_producao', {
        p_ordem_id: ordem.id,
        p_usuario_id: user.id,
      })
      if (error) { setError(error.message); return }
      router.refresh()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{ordem.numero}</h1>
                <StatusBadge status={ordem.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Criado em: {new Date(ordem.created_at).toLocaleDateString('pt-BR')}
                {ordem.profiles?.nome && <span> · por {ordem.profiles.nome}</span>}
              </p>
              {ordem.status === 'emitida' && ordem.emitida_at && (
                <p className="text-sm text-muted-foreground">
                  Emitida em: {new Date(ordem.emitida_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items table card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Itens da Ordem</CardTitle>
        </CardHeader>
        <CardContent>
          {ordem.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item nesta ordem.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ordem.itens.map((item) => {
                  const isPelicula = item.pelicula_id !== null
                  return (
                    <tr key={item.id}>
                      <td className="py-2">{isPelicula ? '🎞️ Película' : '🧪 MP'}</td>
                      <td className="py-2">{item.peliculas?.nome ?? item.materias_primas?.nome ?? '—'}</td>
                      <td className="py-2 text-right">
                        {isPelicula
                          ? `${item.quantidade.toFixed(1)} m`
                          : `${item.quantidade.toFixed(2)} ${item.materias_primas?.unidade ?? 'kg'}`
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Actions card */}
      {ordem.status !== 'cancelada' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ordem.status === 'rascunho' && (
                <Button
                  onClick={handleEmitir}
                  disabled={loading !== null}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading === 'emitir' ? 'Emitindo...' : '✅ Emitir OP'}
                </Button>
              )}
              <Button
                onClick={handleCancelar}
                disabled={loading !== null}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {loading === 'cancelar' ? 'Cancelando...' : '❌ Cancelar OP'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Link href="/ordens-producao" className="text-sm text-muted-foreground hover:underline">
        ← Voltar para Ordens
      </Link>
    </div>
  )
}
