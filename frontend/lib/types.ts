export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  criado_em: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  criado_em: string;
}

export interface Preco {
  id: number;
  produto_id: number;
  produto_nome?: string;
  fornecedor_id: number;
  fornecedor_nome?: string;
  data: string;
  valor: number;
  criado_em?: string;
}

export interface PontoHistorico {
  data: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  valor: number;
}

export interface LinhaComparativo {
  fornecedor_id: number;
  fornecedor_nome: string;
  data: string;
  valor: number;
}

export interface PaginaPrecos {
  dados: Preco[];
  pagina: number;
  tamanho: number;
  total: number;
}
