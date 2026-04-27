CREATE TABLE IF NOT EXISTS produtos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL UNIQUE,
    descricao   TEXT,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedores (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(160) NOT NULL,
    cnpj        VARCHAR(18)  NOT NULL UNIQUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS precos (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    fornecedor_id   INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
    data            DATE    NOT NULL,
    valor           NUMERIC(10,3) NOT NULL CHECK (valor > 0),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Bloqueia duplicata: mesmo fornecedor não pode registrar o mesmo produto duas vezes no mesmo dia
    CONSTRAINT precos_unicos UNIQUE (produto_id, fornecedor_id, data)
);

CREATE INDEX IF NOT EXISTS idx_precos_produto_data ON precos (produto_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_precos_fornecedor   ON precos (fornecedor_id);

-- Dados iniciais
INSERT INTO produtos (nome, descricao) VALUES
    ('Diesel S10',     'Óleo diesel com baixo teor de enxofre'),
    ('Biodiesel B100', 'Biodiesel puro'),
    ('Gasolina Comum', 'Gasolina tipo C')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO fornecedores (nome, cnpj) VALUES
    ('Petrobras Distribuidora', '34.274.233/0001-02'),
    ('Ipiranga',                '33.337.122/0001-27'),
    ('Raízen',                  '33.453.598/0001-23')
ON CONFLICT (cnpj) DO NOTHING;
