"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Produto, Fornecedor } from "@/lib/types";

// Aplica a máscara XX.XXX.XXX/XXXX-XX enquanto o usuário digita.
// Aceita apenas dígitos; ignora qualquer outro caractere.
function mascararCNPJ(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  const partes: string[] = [];
  if (digitos.length > 0) partes.push(digitos.slice(0, 2));
  if (digitos.length > 2) partes[0] += "." + digitos.slice(2, 5);
  if (digitos.length > 5) partes[0] += "." + digitos.slice(5, 8);
  if (digitos.length > 8) partes[0] += "/" + digitos.slice(8, 12);
  if (digitos.length > 12) partes[0] += "-" + digitos.slice(12, 14);
  return partes[0] ?? "";
}

export default function Gestao() {
  const [aba, setAba] = useState<"produtos" | "fornecedores">("produtos");

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Gestão</h2>

      <div className="flex gap-2 mb-6 border-b">
        {(["produtos", "fornecedores"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px " +
              (aba === a
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700")
            }
          >
            {a === "produtos" ? "Produtos" : "Fornecedores"}
          </button>
        ))}
      </div>

      {aba === "produtos" ? <SecaoProdutos /> : <SecaoFornecedores />}
    </div>
  );
}

function SecaoProdutos() {
  const [lista, setLista] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function recarregar() {
    api.listarProdutos().then(setLista).catch((e: Error) =>
      setMsg({ tipo: "erro", texto: e.message }),
    );
  }
  useEffect(recarregar, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.criarProduto(nome, descricao);
      setNome("");
      setDescricao("");
      setMsg({ tipo: "ok", texto: "Produto cadastrado." });
      recarregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: (err as Error).message });
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={adicionar} className="bg-white border rounded-lg p-5 space-y-3">
        <h3 className="font-semibold">Novo produto</h3>
        <input
          required
          placeholder="Nome (ex.: Diesel S10)"
          className="w-full border rounded px-3 py-2"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <textarea
          placeholder="Descrição (opcional)"
          className="w-full border rounded px-3 py-2"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700">
          Cadastrar
        </button>
        {msg && (
          <div
            className={
              "text-sm px-3 py-2 rounded " +
              (msg.tipo === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")
            }
          >
            {msg.texto}
          </div>
        )}
      </form>

      <div>
        <h3 className="font-semibold mb-3">Produtos cadastrados</h3>
        <ul className="bg-white border rounded-lg divide-y">
          {lista.map((p) => (
            <li key={p.id} className="p-3">
              <p className="font-medium">{p.nome}</p>
              {p.descricao && <p className="text-sm text-slate-500">{p.descricao}</p>}
            </li>
          ))}
          {lista.length === 0 && (
            <li className="p-3 text-sm text-slate-500">Nenhum produto.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function SecaoFornecedores() {
  const [lista, setLista] = useState<Fornecedor[]>([]);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function recarregar() {
    api.listarFornecedores().then(setLista).catch((e: Error) =>
      setMsg({ tipo: "erro", texto: e.message }),
    );
  }
  useEffect(recarregar, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.criarFornecedor(nome, cnpj);
      setNome("");
      setCnpj("");
      setMsg({ tipo: "ok", texto: "Fornecedor cadastrado." });
      recarregar();
    } catch (err) {
      setMsg({ tipo: "erro", texto: (err as Error).message });
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <form onSubmit={adicionar} className="bg-white border rounded-lg p-5 space-y-3">
        <h3 className="font-semibold">Novo fornecedor</h3>
        <input
          required
          placeholder="Nome"
          className="w-full border rounded px-3 py-2"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          required
          placeholder="CNPJ (00.000.000/0000-00)"
          inputMode="numeric"
          maxLength={18}
          className="w-full border rounded px-3 py-2"
          value={cnpj}
          onChange={(e) => setCnpj(mascararCNPJ(e.target.value))}
        />
        <button className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700">
          Cadastrar
        </button>
        {msg && (
          <div
            className={
              "text-sm px-3 py-2 rounded " +
              (msg.tipo === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")
            }
          >
            {msg.texto}
          </div>
        )}
      </form>

      <div>
        <h3 className="font-semibold mb-3">Fornecedores cadastrados</h3>
        <ul className="bg-white border rounded-lg divide-y">
          {lista.map((f) => (
            <li key={f.id} className="p-3">
              <p className="font-medium">{f.nome}</p>
              <p className="text-sm text-slate-500">{f.cnpj}</p>
            </li>
          ))}
          {lista.length === 0 && (
            <li className="p-3 text-sm text-slate-500">Nenhum fornecedor.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
