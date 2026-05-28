import * as XLSX from 'xlsx'

export function exportMPToXLSX(rows: {
  nome: string; entradas: number; saidas: number; saldo: number
}[]): Uint8Array {
  const data = rows.map(r => ({
    'Material': r.nome,
    'Entradas (kg)': r.entradas,
    'Saídas (kg)': r.saidas,
    'Saldo Atual (kg)': r.saldo,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Matérias-Primas')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array
}

export function exportPFToXLSX(rows: {
  nome: string; produzido: number; expedido: number
  saldo_verde: number; saldo_amarelo: number; saldo_vermelho: number
}[]): Uint8Array {
  const data = rows.map(r => ({
    'Produto': r.nome,
    'Produzido (cx)': r.produzido,
    'Expedido (cx)': r.expedido,
    '🟢 Verde (cx)': r.saldo_verde,
    '🟡 Amarelo (cx)': r.saldo_amarelo,
    '🔴 Vermelho (cx)': r.saldo_vermelho,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos Finalizados')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array
}

export function exportPeliculasToXLSX(rows: {
  nome: string; largura: string; tonalidade: string; espessura: string;
  entradas: number; saidas: number; saldo: number
}[]): Uint8Array {
  const data = rows.map(r => ({
    'Película': r.nome,
    'Largura': r.largura,
    'Tonalidade': r.tonalidade,
    'Espessura': r.espessura,
    'Entradas (m)': r.entradas,
    'Saídas (m)': r.saidas,
    'Saldo (m)': r.saldo,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Películas')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array
}
