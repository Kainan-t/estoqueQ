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
  ordem_producao_id?: string | null  // populated for Corte records; null for legacy records
  metros_cortados?: number | null    // meters of bobbin fed into the cutter; null for legacy records
  profiles?: Pick<Profile, 'nome'>
}

export interface RegistroCorte extends MovimentacaoPF {
  tipo: 'producao'  // narrows MovimentacaoPF.tipo to only the 'producao' variant
  produtos_finalizados?: Pick<ProdutoFinalizado, 'nome'>
  ordens_producao?: Pick<OrdemProducao, 'numero'>
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

export type TipoPelicula = 'entrada' | 'saida'

export interface Pelicula {
  id: string
  nome: string
  largura: string
  tonalidade: string
  espessura: string
  protecao_uva: string
  protecao_uvb: string
  estoque_minimo: number
  created_at: string
}

export interface MovimentacaoPelicula {
  id: string
  pelicula_id: string
  tipo: TipoPelicula
  quantidade_metros: number
  data: string
  usuario_id: string
  observacao: string | null
  created_at: string
  profiles?: Pick<Profile, 'nome'>
}

export interface PeliculaComSaldo extends Pelicula {
  saldo: number
  em_alerta: boolean
  movimentacoes?: MovimentacaoPelicula[]
}

export type StatusOP = 'rascunho' | 'emitida' | 'cancelada'

export interface OrdemProducao {
  id: string
  numero: string
  status: StatusOP
  observacao: string | null
  usuario_id: string
  created_at: string
  emitida_at: string | null
}

export interface MesclaIngrediente {
  id: string
  mescla_id: string
  materia_prima_id: string
  quantidade_por_mescla: number
  materias_primas?: Pick<MateriaPrima, 'nome' | 'unidade'>
}

export interface Mescla {
  id: string
  nome: string
  created_at: string
  mescla_ingredientes?: MesclaIngrediente[]
}

export interface OrdemProducaoItem {
  id: string
  ordem_id: string
  pelicula_id: string | null
  materia_prima_id: string | null
  mescla_id: string | null
  quantidade: number
  peliculas?: Pick<Pelicula, 'nome' | 'largura' | 'tonalidade' | 'espessura'>
  materias_primas?: Pick<MateriaPrima, 'nome' | 'unidade'>
  mesclas?: Pick<Mescla, 'nome'>
}

export interface OrdemProducaoComItens extends OrdemProducao {
  itens: OrdemProducaoItem[]
}
