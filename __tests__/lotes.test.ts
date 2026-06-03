import { slugPelicula, codigoLote, proximoNumeroLote } from '@/lib/lotes'

describe('slugPelicula', () => {
  it('coloca em maiúsculas e remove espaços', () => {
    expect(slugPelicula('Fume 35')).toBe('FUME35')
  })

  it('remove acentos', () => {
    expect(slugPelicula('Fumê')).toBe('FUME')
  })

  it('remove caracteres não alfanuméricos', () => {
    expect(slugPelicula('PS-4 Clear!')).toBe('PS4CLEAR')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(slugPelicula('')).toBe('')
  })
})

describe('codigoLote', () => {
  it('usa o código quando preenchido', () => {
    expect(codigoLote('FUME', 'Fumê 35')).toBe('FUME')
  })

  it('faz slug do código preenchido', () => {
    expect(codigoLote('fu-me', 'Qualquer')).toBe('FUME')
  })

  it('usa o slug do nome quando código é null', () => {
    expect(codigoLote(null, 'Fumê 35')).toBe('FUME35')
  })

  it('usa o slug do nome quando código é vazio/espacos', () => {
    expect(codigoLote('   ', 'G5')).toBe('G5')
  })
})

describe('proximoNumeroLote', () => {
  it('começa em 01 quando não há lotes', () => {
    expect(proximoNumeroLote('0042', 'FUME', [])).toBe('0042-FUME-01')
  })

  it('usa max sufixo + 1', () => {
    const existentes = ['0042-FUME-01', '0042-FUME-02']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-03')
  })

  it('ignora lotes de outro prefixo', () => {
    const existentes = ['0042-G5-01', '0042-G5-02']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-01')
  })

  it('preenche o gap usando max+1 (não contagem)', () => {
    const existentes = ['0042-FUME-01', '0042-FUME-03']
    expect(proximoNumeroLote('0042', 'FUME', existentes)).toBe('0042-FUME-04')
  })
})
