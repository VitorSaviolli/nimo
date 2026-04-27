# Painel de Monitoramento de Preços de Combustível

Sistema web para registrar preços de combustíveis por fornecedor e visualizar a evolução histórica em um painel.

**Stack:** Go (Fiber) · Next.js 14 (App Router) · TypeScript · PostgreSQL 16 · Docker Compose · Tailwind · Recharts

---

## Como rodar

Pré-requisito: **Docker** + **Docker Compose**.

```bash
git clone <url-do-repo> nimo
cd nimo
docker compose up --build
```

Pronto. Após o build:

- **Frontend:** http://localhost:3000
- **API:** http://localhost:8080/api/v1
- **Postgres:** localhost:5432 (usuário `nimo`, senha `nimo`, banco `nimo`)

O banco já vem com **3 produtos** e **3 fornecedores** de exemplo (criados pelo `schema.sql`), basta cadastrar alguns preços na tela "Cadastrar Preço" para ver o gráfico.

### Rodar fora do Docker (opcional)

Backend:

```bash
cd backend
go mod tidy
DATABASE_URL="postgres://nimo:nimo@localhost:5432/nimo?sslmode=disable" go run .
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

### Rodar testes

```bash
cd backend
go test ./...
```

---

## Estrutura do projeto

```
.
├── docker-compose.yml          → sobe db + backend + frontend
├── backend/
│   ├── main.go                 → bootstrap (Fiber, CORS, rotas)
│   ├── db.go                   → conexão Postgres (pgxpool)
│   ├── handlers.go             → handlers de produtos, fornecedores e preços
│   ├── handlers_test.go        → testes de validação
│   ├── schema.sql              → tabelas + dados iniciais (rodado pelo Postgres no 1º start)
│   ├── Dockerfile
│   └── go.mod
└── frontend/
    ├── app/
    │   ├── layout.tsx          → cabeçalho + navegação
    │   ├── page.tsx            → Dashboard (gráfico + comparativo)
    │   ├── cadastrar-preco/    → Tela de cadastro de preço
    │   └── gestao/             → Tela de gestão (produtos e fornecedores)
    ├── lib/
    │   ├── api.ts              → cliente HTTP tipado
    │   └── types.ts            → interfaces compartilhadas
    ├── tailwind.config.ts
    ├── Dockerfile
    └── package.json
```

A estrutura é deliberadamente **plana** — sem camadas de service/repository no backend e sem state-management no frontend. Para o tamanho do projeto, isso mantém o código mais fácil de ler e navegar.

---

## Endpoints da API

Todos sob o prefixo `/api/v1`:

| Método | Rota                              | Descrição                                            |
|--------|-----------------------------------|------------------------------------------------------|
| GET    | `/produtos`                       | Lista todos os produtos                              |
| POST   | `/produtos`                       | Cadastra novo produto                                |
| GET    | `/fornecedores`                   | Lista todos os fornecedores                          |
| POST   | `/fornecedores`                   | Cadastra novo fornecedor                             |
| GET    | `/precos`                         | Lista preços (filtros + paginação)                   |
| POST   | `/precos`                         | Registra novo preço                                  |
| GET    | `/precos/historico/:produto_id`   | Série histórica do produto (todos os fornecedores)   |
| GET    | `/precos/comparativo?produto_id=` | Preço mais recente de cada fornecedor para o produto |

### Exemplos rápidos

```bash
# Cadastrar um preço
curl -X POST http://localhost:8080/api/v1/precos \
  -H "Content-Type: application/json" \
  -d '{"produto_id":1,"fornecedor_id":1,"data":"2026-04-27","valor":5.789}'

# Listar preços filtrando por produto e período
curl "http://localhost:8080/api/v1/precos?produto_id=1&data_inicio=2026-04-01&data_fim=2026-04-30"

# Histórico de um produto
curl http://localhost:8080/api/v1/precos/historico/1

# Comparativo entre fornecedores
curl "http://localhost:8080/api/v1/precos/comparativo?produto_id=1"
```

---

## Decisões nos pontos abertos

### 1. Filtros do `GET /precos`

Optei por aceitar quatro filtros opcionais e combináveis via query string:

| Filtro          | Tipo  | Exemplo            |
|-----------------|-------|--------------------|
| `produto_id`    | int   | `?produto_id=1`    |
| `fornecedor_id` | int   | `?fornecedor_id=2` |
| `data_inicio`   | date  | `?data_inicio=2026-04-01` |
| `data_fim`      | date  | `?data_fim=2026-04-30` |

**Por quê:** são as três dimensões pelas quais alguém de operações naturalmente quer cortar os dados (que produto, qual fornecedor, em que período). Mantive simples — só esses quatro — porque adicionar mais filtros sem demanda real só polui a API.

Adicionei também **paginação** (`pagina`, `tamanho`, default 20, máx 100). A resposta retorna `{ dados, pagina, tamanho, total }` para o frontend conseguir montar uma navegação, se necessário.

### 2. Duplicata de fornecedor + produto + data

**Decisão: bloquear** (constraint `UNIQUE (produto_id, fornecedor_id, data)`, retornando `409 Conflict`).

**Por quê:** cada fornecedor publica um único preço oficial por dia para um produto. Permitir duplicatas geraria ambiguidade ("qual é o preço de hoje?") e poluiria o histórico. Sobrescrever silenciosamente esconderia o erro de quem digitou o valor errado. Bloquear força o usuário a perceber a duplicata e decidir conscientemente — se de fato precisar corrigir, pode-se cadastrar uma rota de edição depois (fora do escopo deste desafio).

---

## Modelagem do banco

```
produtos (id, nome UNIQUE, descricao, criado_em)
fornecedores (id, nome, cnpj UNIQUE, criado_em)
precos (id, produto_id FK, fornecedor_id FK, data, valor CHECK > 0, criado_em)
       └─ UNIQUE (produto_id, fornecedor_id, data)
```

- `valor` em `NUMERIC(10,3)` — preços de combustível normalmente têm 3 casas decimais (ex.: R$ 5,789).
- Índice `(produto_id, data DESC)` para acelerar `historico` e `comparativo`.
- `ON DELETE RESTRICT` nos FKs — não dá pra apagar produto/fornecedor que tem preço registrado.

---

## Diferenciais implementados

- ✅ **Docker Compose** completo (db + backend + frontend) — sobe tudo com um único `docker compose up --build`.
- ✅ **Testes unitários** em `backend/handlers_test.go` (validação de entrada do `POST /precos`).
- ✅ **Paginação** no `GET /precos` com `pagina`/`tamanho` e total na resposta.
- ✅ **Variação percentual** exibida no card de cada fornecedor no Dashboard (compara o preço mais recente com o anterior do mesmo fornecedor).
- ✅ **Tela 3 (Gestão)** com abas para cadastrar produtos e fornecedores.

---

## Observações finais

- Sem autenticação (conforme o documento permite).
- Optei por **não** abstrair em camadas (service/repository) para manter o código simples. O código fica mais imediato de ler e o projeto suficientemente pequeno para que isso faça sentido. Em um projeto maior, com regras de negócio mais ricas, eu separaria.
