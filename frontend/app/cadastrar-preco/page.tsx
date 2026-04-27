"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Produto, Fornecedor } from "@/lib/types";

export default function CadastrarPreco() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtoId, setProdutoId] = useState<string>("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    Promise.all([api.listarProdutos(), api.listarFornecedores()])
      .then(([p, f]) => {
        setProdutos(p);
        setFornecedores(f);
      })
      .catch((e: Error) => setMensagem({ tipo: "erro", texto: e.message }));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      await api.criarPreco(
        Number(produtoId),
        Number(fornecedorId),
        data,
        Number(valor.replace(",", ".")),
      );
      setMensagem({ tipo: "ok", texto: "Preço registrado com sucesso!" });
      setValor("");
    } catch (e) {
      setMensagem({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-6">Cadastrar novo preço</h2>

      <form onSubmit={salvar} className="space-y-4 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Produto</label>
          <select
            required
            className="w-full border rounded px-3 py-2"
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fornecedor</label>
          <select
            required
            className="w-full border rounded px-3 py-2"
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            type="date"
            required
            className="w-full border rounded px-3 py-2"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Preço por litro (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="5.789"
            className="w-full border rounded px-3 py-2"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-emerald-600 text-white py-2 rounded font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar preço"}
        </button>

        {mensagem && (
          <div
            className={
              "text-sm px-3 py-2 rounded " +
              (mensagem.tipo === "ok"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800")
            }
          >
            {mensagem.texto}
          </div>
        )}
      </form>
    </div>
  );
}
