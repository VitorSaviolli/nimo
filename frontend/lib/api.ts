import type {
  Produto,
  Fornecedor,
  PontoHistorico,
  LinhaComparativo,
  PaginaPrecos,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

async function pedir<T>(rota: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${rota}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!resp.ok) {
    const corpo = await resp.json().catch(() => ({}));
    throw new Error(corpo.erro ?? `Erro ${resp.status}`);
  }
  return resp.json();
}

export const api = {
  listarProdutos: () => pedir<Produto[]>("/produtos"),
  criarProduto: (nome: string, descricao: string) =>
    pedir<Produto>("/produtos", { method: "POST", body: JSON.stringify({ nome, descricao }) }),

  listarFornecedores: () => pedir<Fornecedor[]>("/fornecedores"),
  criarFornecedor: (nome: string, cnpj: string) =>
    pedir<Fornecedor>("/fornecedores", { method: "POST", body: JSON.stringify({ nome, cnpj }) }),

  criarPreco: (produto_id: number, fornecedor_id: number, data: string, valor: number) =>
    pedir<unknown>("/precos", {
      method: "POST",
      body: JSON.stringify({ produto_id, fornecedor_id, data, valor }),
    }),

  listarPrecos: (params: {
    pagina?: number;
    tamanho?: number;
    produto_id?: number;
    fornecedor_id?: number;
    data_inicio?: string;
    data_fim?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const sufixo = qs.toString() ? `?${qs.toString()}` : "";
    return pedir<PaginaPrecos>(`/precos${sufixo}`);
  },

  historico: (produtoId: number) =>
    pedir<PontoHistorico[]>(`/precos/historico/${produtoId}`),

  comparativo: (produtoId: number) =>
    pedir<LinhaComparativo[]>(`/precos/comparativo?produto_id=${produtoId}`),
};
