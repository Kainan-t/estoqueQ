import Link from 'next/link'
import type { ProdutoFinalizadoComSaldo } from '@/types'

interface Props { produtos: ProdutoFinalizadoComSaldo[] }

export function PFList({ produtos }: Props) {
  if (produtos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum produto finalizado cadastrado.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 font-semibold">Produto</th>
            <th className="text-center py-2 font-semibold">Total cx</th>
            <th className="text-center py-2 font-semibold text-green-700">🟢 Verde</th>
            <th className="text-center py-2 font-semibold text-amber-600">🟡 Amarelo</th>
            <th className="text-center py-2 font-semibold text-red-600">🔴 Vermelho</th>
            <th className="text-right py-2 font-semibold">Metros est.</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map(pf => (
            <tr key={pf.id} className="border-b hover:bg-slate-50">
              <td className="py-3">
                <Link
                  href={`/produtos-finalizados/${pf.id}`}
                  className="font-medium hover:text-blue-600 hover:underline"
                >
                  {pf.nome}
                </Link>
              </td>
              <td className="text-center font-bold">{pf.saldo.total_caixas}</td>
              <td className="text-center text-green-700">{pf.saldo.cx_verdes}</td>
              <td className="text-center text-amber-600">{pf.saldo.cx_amarelas}</td>
              <td className="text-center text-red-600">{pf.saldo.cx_vermelhas}</td>
              <td className="text-right text-muted-foreground">~{pf.saldo.metros_estimados} m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
