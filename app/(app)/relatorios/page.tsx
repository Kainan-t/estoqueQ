'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function getMonthRange() {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { inicio, fim }
}

export default function RelatoriosPage() {
  const defaults = getMonthRange()
  const [inicio, setInicio] = useState(defaults.inicio)
  const [fim, setFim] = useState(defaults.fim)
  const [loading, setLoading] = useState<'mp' | 'pf' | null>(null)
  const [error, setError] = useState('')

  async function downloadExport(tipo: 'mp' | 'pf') {
    setLoading(tipo)
    setError('')
    try {
      const url = `/api/export?tipo=${tipo}&inicio=${inicio}&fim=${fim}`
      const res = await fetch(url)
      if (!res.ok) {
        setError('Erro ao gerar relatório. Tente novamente.')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `relatorio-${tipo}-${inicio}-${fim}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Período</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <Label>Data início</Label>
              <Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data fim</Label>
              <Input type="date" value={fim} onChange={e => setFim(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">🧪 Matérias-Primas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Entradas, saídas e saldo atual de cada matéria-prima no período selecionado.
            </p>
            <Button onClick={() => downloadExport('mp')} className="w-full" disabled={loading !== null}>
              {loading === 'mp' ? 'Gerando...' : '⬇️ Exportar Excel (.xlsx)'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">📦 Produtos Finalizados</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Produção, expedição e saldo por qualidade de cada produto no período.
            </p>
            <Button onClick={() => downloadExport('pf')} className="w-full" disabled={loading !== null}>
              {loading === 'pf' ? 'Gerando...' : '⬇️ Exportar Excel (.xlsx)'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
