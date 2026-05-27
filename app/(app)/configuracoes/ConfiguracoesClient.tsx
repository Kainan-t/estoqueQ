'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { MateriaPrima, ConfiguracaoQualidade, Profile } from '@/types'

interface Props {
  materias: Pick<MateriaPrima, 'id' | 'nome' | 'estoque_minimo'>[]
  qualidade: ConfiguracaoQualidade[]
  usuarios: Pick<Profile, 'id' | 'nome' | 'cargo'>[]
}

export function ConfiguracoesClient({ materias, qualidade, usuarios }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saveError, setSaveError] = useState('')

  // Estoque mínimo
  const [minimoValues, setMinimoValues] = useState<Record<string, string>>(
    Object.fromEntries(materias.map(m => [m.id, String(m.estoque_minimo)]))
  )
  const [savingMinimo, setSavingMinimo] = useState<string | null>(null)

  async function salvarMinimo(id: string) {
    const val = parseFloat(minimoValues[id])
    if (isNaN(val) || val < 0) return
    setSavingMinimo(id)
    setSaveError('')
    try {
      const { error } = await supabase.from('materias_primas').update({ estoque_minimo: val }).eq('id', id)
      if (error) { setSaveError('Erro ao salvar estoque mínimo.'); return }
      router.refresh()
    } finally {
      setSavingMinimo(null)
    }
  }

  // Qualidade
  const corLabel: Record<string, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' }
  const [qualValues, setQualValues] = useState<Record<string, string>>(
    Object.fromEntries(qualidade.map(q => [q.cor, q.descricao]))
  )
  const [savingQual, setSavingQual] = useState<string | null>(null)

  async function salvarQualidade(cor: string) {
    setSavingQual(cor)
    setSaveError('')
    try {
      const { error } = await supabase.from('configuracoes_qualidade').update({ descricao: qualValues[cor] }).eq('cor', cor)
      if (error) { setSaveError('Erro ao salvar critério de qualidade.'); return }
      router.refresh()
    } finally {
      setSavingQual(null)
    }
  }

  // Cargo de usuário
  const [savingCargo, setSavingCargo] = useState<string | null>(null)

  async function alterarCargo(id: string, cargo: 'admin' | 'operador') {
    setSavingCargo(id)
    setSaveError('')
    try {
      const { error } = await supabase.from('profiles').update({ cargo }).eq('id', id)
      if (error) { setSaveError('Erro ao alterar cargo.'); return }
      router.refresh()
    } finally {
      setSavingCargo(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {saveError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</p>
      )}

      {/* Estoque mínimo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Estoque mínimo — Matérias-Primas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {materias.map(mp => (
              <div key={mp.id} className="flex items-center gap-3">
                <Label className="w-40 text-sm">{mp.nome}</Label>
                <Input type="number" min="0" step="0.1" className="w-28"
                  value={minimoValues[mp.id]}
                  onChange={e => setMinimoValues(p => ({ ...p, [mp.id]: e.target.value }))} />
                <span className="text-xs text-muted-foreground">kg</span>
                <Button size="sm" onClick={() => salvarMinimo(mp.id)}
                  disabled={savingMinimo === mp.id}>
                  {savingMinimo === mp.id ? '...' : 'Salvar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critérios de qualidade */}
      <Card>
        <CardHeader><CardTitle className="text-base">Critérios de qualidade</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(['verde', 'amarelo', 'vermelho'] as const).map(cor => (
              <div key={cor} className="flex items-center gap-3">
                <span className="text-xl">{corLabel[cor]}</span>
                <Input className="flex-1"
                  value={qualValues[cor] ?? ''}
                  onChange={e => setQualValues(p => ({ ...p, [cor]: e.target.value }))} />
                <Button size="sm" onClick={() => salvarQualidade(cor)} disabled={savingQual === cor}>
                  {savingQual === cor ? '...' : 'Salvar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usuários */}
      <Card>
        <CardHeader><CardTitle className="text-base">Usuários</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {usuarios.map(u => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.nome}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {u.cargo === 'admin' ? 'Admin' : 'Operador'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {u.cargo !== 'admin' && (
                    <Button size="sm" variant="outline" onClick={() => alterarCargo(u.id, 'admin')}
                      disabled={savingCargo === u.id}>
                      {savingCargo === u.id ? '...' : 'Tornar Admin'}
                    </Button>
                  )}
                  {u.cargo !== 'operador' && (
                    <Button size="sm" variant="outline" onClick={() => alterarCargo(u.id, 'operador')}
                      disabled={savingCargo === u.id}>
                      {savingCargo === u.id ? '...' : 'Tornar Operador'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Para convidar novos usuários, vá ao painel do Supabase → Authentication → Invite user.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
