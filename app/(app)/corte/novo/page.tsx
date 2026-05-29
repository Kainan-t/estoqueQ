import { getOPsEmitidas, getProdutosParaCorte } from '@/lib/queries/corte'
import { NovoCorteForm } from '@/components/corte/NovoCorteForm'

export default async function NovoCorteePage() {
  const [ops, produtos] = await Promise.all([
    getOPsEmitidas(),
    getProdutosParaCorte(),
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Registrar Corte</h1>
      <NovoCorteForm ops={ops} produtos={produtos} />
    </div>
  )
}
