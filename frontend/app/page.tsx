"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import type { Produto, PontoHistorico, LinhaComparativo } from "@/lib/types";

// Cores fixas pra cada linha do gráfico (até 6 fornecedores)
const CORES = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function Dashboard() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [historico, setHistorico] = useState<PontoHistorico[]>([]);
  const [comparativo, setComparativo] = useState<LinhaComparativo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarProdutos()
      .then((lista) => {
        setProdutos(lista);
        if (lista.length > 0) setProdutoId(lista[0].id);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (produtoId === null) return;
    setCarregando(true);
    setErro(null);
    Promise.all([api.historico(produtoId), api.comparativo(produtoId)])
      .then(([h, c]) => {
        setHistorico(h);
        setComparativo(c);
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [produtoId]);

  // Pivot: { data, [fornecedorNome]: valor }
  const dadosGrafico = useMemo(() => {
    const mapa = new Map<string, Record<string, number | string>>();
    for (const p of historico) {
      const linha = mapa.get(p.data) ?? { data: p.data };
      linha[p.fornecedor_nome] = p.valor;
      mapa.set(p.data, linha);
    }
    return Array.from(mapa.values()).sort((a, b) =>
      String(a.data).localeCompare(String(b.data)),
    );
  }, [historico]);

  const fornecedoresNoGrafico = useMemo(
    () => Array.from(new Set(historico.map((p) => p.fornecedor_nome))),
    [historico],
  );

  // Variação percentual: para cada fornecedor, comparar valor atual vs. penúltimo registro
  const variacaoPorFornecedor = useMemo(() => {
    const mapa = new Map<number, number | null>();
    const porForn = new Map<number, PontoHistorico[]>();
    for (const p of historico) {
      const arr = porForn.get(p.fornecedor_id) ?? [];
      arr.push(p);
      porForn.set(p.fornecedor_id, arr);
    }
    porForn.forEach((arr, id) => {
      arr.sort((a, b) => a.data.localeCompare(b.data));
      if (arr.length < 2) {
        mapa.set(id, null);
        return;
      }
      const ultimo = arr[arr.length - 1].valor;
      const anterior = arr[arr.length - 2].valor;
      mapa.set(id, ((ultimo - anterior) / anterior) * 100);
    });
    return mapa;
  }, [historico]);

  const menorPreco = comparativo.length
    ? Math.min(...comparativo.map((l) => l.valor))
    : null;

  return (
    <div className="space-y-8">
      <section className="flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Produto</label>
          <select
            className="border rounded px-3 py-2 min-w-[260px]"
            value={produtoId ?? ""}
            onChange={(e) => setProdutoId(Number(e.target.value))}
          >
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        {carregando && <span className="text-slate-500 text-sm">Carregando…</span>}
      </section>

      {erro && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded">
          {erro}
        </div>
      )}

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Evolução do preço</h2>
        {dadosGrafico.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum registro de preço para esse produto.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis tickFormatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
              <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(3)}`} />
              <Legend />
              {fornecedoresNoGrafico.map((nome, i) => (
                <Line
                  key={nome}
                  type="monotone"
                  dataKey={nome}
                  stroke={CORES[i % CORES.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Preço mais recente por fornecedor</h2>
        {comparativo.length === 0 ? (
          <p className="text-slate-500 text-sm">Sem dados de comparativo.</p>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {comparativo.map((l) => {
              const eOMaisBarato = l.valor === menorPreco;
              const variacao = variacaoPorFornecedor.get(l.fornecedor_id);
              return (
                <div
                  key={l.fornecedor_id}
                  className={
                    "border rounded-lg p-4 " +
                    (eOMaisBarato
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white")
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{l.fornecedor_nome}</p>
                    {eOMaisBarato && (
                      <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">
                        Mais barato
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    R$ {l.valor.toFixed(3)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">em {l.data}</p>
                  {variacao !== null && variacao !== undefined && (
                    <p
                      className={
                        "text-xs mt-2 font-medium " +
                        (variacao > 0
                          ? "text-red-600"
                          : variacao < 0
                          ? "text-emerald-600"
                          : "text-slate-500")
                      }
                    >
                      {variacao > 0 ? "▲" : variacao < 0 ? "▼" : "■"}{" "}
                      {Math.abs(variacao).toFixed(2)}% vs. registro anterior
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
