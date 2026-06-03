// Normaliza um texto para uso em código de lote:
// maiúsculas, sem acentos, somente A-Z e 0-9.
export function slugPelicula(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // remove marcas de acento combinantes (após NFD)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

// Código da película para o lote: usa `codigo` se preenchido, senão o nome.
// Em ambos os casos passa pelo slug para garantir formato consistente.
export function codigoLote(codigo: string | null, nome: string): string {
  const c = (codigo ?? '').trim()
  return c ? slugPelicula(c) : slugPelicula(nome)
}

// Próximo número de lote no formato {numeroOp}-{codigo}-{NN}.
// Usa o maior sufixo existente + 1 (não a contagem), evitando colisão
// quando um lote do meio é apagado. Começa em 01.
export function proximoNumeroLote(
  numeroOp: string,
  codigo: string,
  numerosExistentes: string[]
): string {
  const prefixo = `${numeroOp}-${codigo}-`
  let max = 0
  for (const num of numerosExistentes) {
    if (num.startsWith(prefixo)) {
      const sufixo = num.slice(prefixo.length)
      const n = parseInt(sufixo, 10)
      if (!isNaN(n) && n > max) max = n
    }
  }
  return `${prefixo}${String(max + 1).padStart(2, '0')}`
}
