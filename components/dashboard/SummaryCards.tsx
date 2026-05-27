import { Card, CardContent } from '@/components/ui/card'

interface Props {
  totalMP: number
  totalPF: number
  alertas: number
}

export function SummaryCards({ totalMP, totalPF, alertas }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Matérias-Primas</p>
          <p className="text-3xl font-bold">{totalMP}</p>
          <p className="text-xs text-green-600">materiais cadastrados</p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Prod. Finalizados</p>
          <p className="text-3xl font-bold">{totalPF}</p>
          <p className="text-xs text-blue-600">produtos cadastrados</p>
        </CardContent>
      </Card>
      <Card className={`border-l-4 ${alertas > 0 ? 'border-l-amber-500' : 'border-l-slate-300'}`}>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Alertas</p>
          <p className={`text-3xl font-bold ${alertas > 0 ? 'text-amber-600' : ''}`}>{alertas}</p>
          <p className="text-xs text-muted-foreground">estoque mínimo</p>
        </CardContent>
      </Card>
    </div>
  )
}
