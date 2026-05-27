export type Cargo = 'admin' | 'operador'
export type TipoMP = 'entrada' | 'saida'
export type TipoPF = 'producao' | 'expedicao'

export interface Profile {
  id: string
  nome: string
  cargo: Cargo
  created_at: string
}

export interface MateriaPrima {
  id: string
  nome: string
  unidade: string
  estoque_minimo: number
  created_at: string
}

export interface MovimentacaoMP {
  id: string
  materia_prima_id: string
  tipo: TipoMP
  quantidade: number
  data: string
  usuario_id: string
  observacao: string | null
  created_at: string
  profiles?: Pick<Profile, 'nome'>
}

export interface MateriaPrimaComSaldo extends MateriaPrima {
  saldo: number
  em_alerta: boolean
  movimentacoes?: MovimentacaoMP[]
}

export interface ProdutoFinalizado {
  id: string
  nome: string
  created_at: string
}

export interface MovimentacaoPF {
  id: string
  produto_id: string
  tipo: TipoPF
  metros_por_caixa: number | null
  cx_verdes: number
  cx_amarelas: number
  cx_vermelhas: number
  data: string
  usuario_id: string
  observacao: string | null
  created_at: string
  profiles?: Pick<Profile, 'nome'>
}

export interface SaldoPF {
  cx_verdes: number
  cx_amarelas: number
  cx_vermelhas: number
  total_caixas: number
  metros_estimados: number
}

export interface ProdutoFinalizadoComSaldo extends ProdutoFinalizado {
  saldo: SaldoPF
}

export interface ConfiguracaoQualidade {
  id: string
  cor: 'verde' | 'amarelo' | 'vermelho'
  descricao: string
}

export interface FiltroRelatorio {
  dataInicio: string
  dataFim: string
  itemId?: string
}
