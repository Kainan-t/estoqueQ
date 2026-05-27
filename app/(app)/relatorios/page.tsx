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

  function downloadExport(tipo: 'mp' | 'pf') {
    const url = `/api/export?tipo=${tipo}&inicio=${inicio}&fim=${fim}`
    window.open(url, '_blank')
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">🧪 Matérias-Primas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Entradas, saídas e saldo atual de cada matéria-prima no período selecionado.
            </p>
            <Button onClick={() => downloadExport('mp')} className="w-full">
              ⬇️ Exportar Excel (.xlsx)
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">📦 Produtos Finalizados</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Produção, expedição e saldo por qualidade de cada produto no período.
            </p>
            <Button onClick={() => downloadExport('pf')} className="w-full">
              ⬇️ Exportar Excel (.xlsx)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
