import { getMateriasComSaldo } from '@/lib/queries/materias-primas'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function MateriasPage() {
  const materias = await getMateriasComSaldo()

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Matérias-Primas</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materias.map((mp) => (
            <TableRow key={mp.id}>
              <TableCell>{mp.nome}</TableCell>
              <TableCell>{mp.unidade}</TableCell>
              <TableCell>{mp.saldo}</TableCell>
              <TableCell>
                {mp.em_alerta && (
                  <Badge variant="destructive">Abaixo do mínimo</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
