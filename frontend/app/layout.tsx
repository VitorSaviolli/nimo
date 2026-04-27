import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimo — Painel de Preços",
  description: "Monitoramento de preços de combustível",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="bg-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="font-bold text-lg">Nimo · Painel de Preços</h1>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-emerald-300">Dashboard</Link>
              <Link href="/cadastrar-preco" className="hover:text-emerald-300">Cadastrar Preço</Link>
              <Link href="/gestao" className="hover:text-emerald-300">Gestão</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
