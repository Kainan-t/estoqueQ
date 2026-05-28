import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  totalMP: number
  alertasMP: number
  totalPelicula: number
  alertasPelicula: number
  totalPF: number
  totalCaixas: number
  opsRascunho: number
  opsEmitidas: number
}

export function SummaryCards({
  totalMP,
  alertasMP,
  totalPelicula,
  alertasPelicula,
  totalPF,
  totalCaixas,
  opsRascunho,
  opsEmitidas,
}: Props) {
  const totalAlertas = alertasMP + alertasPelicula

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* Matérias-Primas */}
      <Link href="/materias-primas">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-emerald-500 cursor-pointer h-full">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Mat. Primas</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">{totalMP}</p>
                <p className="text-xs text-muted-foreground mt-1">cadastradas</p>
              </div>
              <span className="text-xl shrink-0 ml-1">🧪</span>
            </div>
            {alertasMP > 0 && (
              <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block">
                ⚠️ {alertasMP} em alerta
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Películas */}
      <Link href="/peliculas">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-violet-500 cursor-pointer h-full">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Películas</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">{totalPelicula}</p>
                <p className="text-xs text-muted-foreground mt-1">cadastradas</p>
              </div>
              <span className="text-xl shrink-0 ml-1">🎞️</span>
            </div>
            {alertasPelicula > 0 && (
              <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block">
                ⚠️ {alertasPelicula} em alerta
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Produtos Finalizados */}
      <Link href="/produtos-finalizados">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-sky-500 cursor-pointer h-full">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Prod. Final.</p>
                <p className="text-3xl font-bold mt-1 tabular-nums">{totalPF}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalCaixas > 0 ? `${totalCaixas} cx em estoque` : 'produtos'}
                </p>
              </div>
              <span className="text-xl shrink-0 ml-1">📦</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Alertas de Estoque */}
      <Link href="/materias-primas">
        <Card
          className={`hover:shadow-md transition-shadow border-t-4 cursor-pointer h-full ${
            totalAlertas > 0 ? 'border-t-red-500 bg-red-50/40' : 'border-t-slate-200'
          }`}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Alertas</p>
                <p
                  className={`text-3xl font-bold mt-1 tabular-nums ${
                    totalAlertas > 0 ? 'text-red-600' : 'text-slate-400'
                  }`}
                >
                  {totalAlertas}
                </p>
                <p className="text-xs text-muted-foreground mt-1">est. mínimo</p>
              </div>
              <span className="text-xl shrink-0 ml-1">{totalAlertas > 0 ? '🔴' : '✅'}</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* OPs em Rascunho */}
      <Link href="/ordens-producao">
        <Card
          className={`hover:shadow-md transition-shadow border-t-4 cursor-pointer h-full ${
            opsRascunho > 0 ? 'border-t-amber-500' : 'border-t-slate-200'
          }`}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Rascunhos</p>
                <p
                  className={`text-3xl font-bold mt-1 tabular-nums ${
                    opsRascunho > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {opsRascunho}
                </p>
                <p className="text-xs text-muted-foreground mt-1">OPs pendentes</p>
              </div>
              <span className="text-xl shrink-0 ml-1">📋</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* OPs Emitidas */}
      <Link href="/ordens-producao">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500 cursor-pointer h-full">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Emitidas</p>
                <p className="text-3xl font-bold mt-1 text-blue-600 tabular-nums">{opsEmitidas}</p>
                <p className="text-xs text-muted-foreground mt-1">em produção</p>
              </div>
              <span className="text-xl shrink-0 ml-1">✅</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
