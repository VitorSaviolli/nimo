package main

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"
)

// ---------- Tipos ----------

type Produto struct {
	ID        int       `json:"id"`
	Nome      string    `json:"nome"`
	Descricao string    `json:"descricao"`
	CriadoEm  time.Time `json:"criado_em"`
}

type Fornecedor struct {
	ID       int       `json:"id"`
	Nome     string    `json:"nome"`
	CNPJ     string    `json:"cnpj"`
	CriadoEm time.Time `json:"criado_em"`
}

type Preco struct {
	ID            int       `json:"id"`
	ProdutoID     int       `json:"produto_id"`
	ProdutoNome   string    `json:"produto_nome,omitempty"`
	FornecedorID  int       `json:"fornecedor_id"`
	FornecedorNome string   `json:"fornecedor_nome,omitempty"`
	Data          string    `json:"data"`  // YYYY-MM-DD
	Valor         float64   `json:"valor"`
	CriadoEm      time.Time `json:"criado_em,omitempty"`
}

// ---------- Helpers ----------

func erro(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{"erro": msg})
}

// limparCNPJ remove tudo que não é dígito.
func limparCNPJ(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// formatarCNPJ recebe 14 dígitos e devolve "XX.XXX.XXX/XXXX-XX".
func formatarCNPJ(d string) string {
	return d[0:2] + "." + d[2:5] + "." + d[5:8] + "/" + d[8:12] + "-" + d[12:14]
}

// validarCNPJ checa se a string tem 14 dígitos e se os dígitos verificadores
// batem com o algoritmo oficial. Recusa também sequências repetidas (11111111111111).
func validarCNPJ(d string) bool {
	if len(d) != 14 {
		return false
	}
	todosIguais := true
	for i := 1; i < 14; i++ {
		if d[i] != d[0] {
			todosIguais = false
			break
		}
	}
	if todosIguais {
		return false
	}

	calcularDigito := func(base string, pesos []int) int {
		soma := 0
		for i, p := range pesos {
			soma += int(base[i]-'0') * p
		}
		resto := soma % 11
		if resto < 2 {
			return 0
		}
		return 11 - resto
	}

	pesos1 := []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	pesos2 := []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}

	dig1 := calcularDigito(d[:12], pesos1)
	dig2 := calcularDigito(d[:13], pesos2)

	return dig1 == int(d[12]-'0') && dig2 == int(d[13]-'0')
}

// ---------- Produtos ----------

func listarProdutos(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(),
		`SELECT id, nome, COALESCE(descricao,''), criado_em FROM produtos ORDER BY nome`)
	if err != nil {
		return erro(c, 500, err.Error())
	}
	defer rows.Close()

	produtos := []Produto{}
	for rows.Next() {
		var p Produto
		if err := rows.Scan(&p.ID, &p.Nome, &p.Descricao, &p.CriadoEm); err != nil {
			return erro(c, 500, err.Error())
		}
		produtos = append(produtos, p)
	}
	return c.JSON(produtos)
}

func criarProduto(c *fiber.Ctx) error {
	var entrada struct {
		Nome      string `json:"nome"`
		Descricao string `json:"descricao"`
	}
	if err := c.BodyParser(&entrada); err != nil {
		return erro(c, 400, "JSON inválido")
	}
	entrada.Nome = strings.TrimSpace(entrada.Nome)
	if entrada.Nome == "" {
		return erro(c, 400, "nome é obrigatório")
	}

	var p Produto
	err := db.QueryRow(context.Background(),
		`INSERT INTO produtos (nome, descricao) VALUES ($1, $2)
		 RETURNING id, nome, COALESCE(descricao,''), criado_em`,
		entrada.Nome, entrada.Descricao,
	).Scan(&p.ID, &p.Nome, &p.Descricao, &p.CriadoEm)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return erro(c, 409, "já existe um produto com esse nome")
	}
	if err != nil {
		return erro(c, 500, err.Error())
	}
	return c.Status(201).JSON(p)
}

// ---------- Fornecedores ----------

func listarFornecedores(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(),
		`SELECT id, nome, cnpj, criado_em FROM fornecedores ORDER BY nome`)
	if err != nil {
		return erro(c, 500, err.Error())
	}
	defer rows.Close()

	lista := []Fornecedor{}
	for rows.Next() {
		var f Fornecedor
		if err := rows.Scan(&f.ID, &f.Nome, &f.CNPJ, &f.CriadoEm); err != nil {
			return erro(c, 500, err.Error())
		}
		lista = append(lista, f)
	}
	return c.JSON(lista)
}

func criarFornecedor(c *fiber.Ctx) error {
	var entrada struct {
		Nome string `json:"nome"`
		CNPJ string `json:"cnpj"`
	}
	if err := c.BodyParser(&entrada); err != nil {
		return erro(c, 400, "JSON inválido")
	}
	entrada.Nome = strings.TrimSpace(entrada.Nome)
	if entrada.Nome == "" {
		return erro(c, 400, "nome é obrigatório")
	}

	// Aceita CNPJ com ou sem máscara — limpa e valida pelos dígitos.
	cnpjDigitos := limparCNPJ(entrada.CNPJ)
	if !validarCNPJ(cnpjDigitos) {
		return erro(c, 400, "CNPJ inválido")
	}
	cnpjFormatado := formatarCNPJ(cnpjDigitos)

	var f Fornecedor
	err := db.QueryRow(context.Background(),
		`INSERT INTO fornecedores (nome, cnpj) VALUES ($1, $2)
		 RETURNING id, nome, cnpj, criado_em`,
		entrada.Nome, cnpjFormatado,
	).Scan(&f.ID, &f.Nome, &f.CNPJ, &f.CriadoEm)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return erro(c, 409, "já existe um fornecedor com esse CNPJ")
	}
	if err != nil {
		return erro(c, 500, err.Error())
	}
	return c.Status(201).JSON(f)
}

// ---------- Preços ----------

// GET /precos
// Filtros opcionais (combináveis): produto_id, fornecedor_id, data_inicio, data_fim.
// Paginação: pagina (default 1), tamanho (default 20, máx 100).
func listarPrecos(c *fiber.Ctx) error {
	condicoes := []string{}
	args := []any{}
	idx := 1

	if v := c.Query("produto_id"); v != "" {
		condicoes = append(condicoes, "p.produto_id = $"+strconv.Itoa(idx))
		args = append(args, v)
		idx++
	}
	if v := c.Query("fornecedor_id"); v != "" {
		condicoes = append(condicoes, "p.fornecedor_id = $"+strconv.Itoa(idx))
		args = append(args, v)
		idx++
	}
	if v := c.Query("data_inicio"); v != "" {
		condicoes = append(condicoes, "p.data >= $"+strconv.Itoa(idx))
		args = append(args, v)
		idx++
	}
	if v := c.Query("data_fim"); v != "" {
		condicoes = append(condicoes, "p.data <= $"+strconv.Itoa(idx))
		args = append(args, v)
		idx++
	}

	where := ""
	if len(condicoes) > 0 {
		where = "WHERE " + strings.Join(condicoes, " AND ")
	}

	pagina, _ := strconv.Atoi(c.Query("pagina", "1"))
	if pagina < 1 {
		pagina = 1
	}
	tamanho, _ := strconv.Atoi(c.Query("tamanho", "20"))
	if tamanho < 1 || tamanho > 100 {
		tamanho = 20
	}
	offset := (pagina - 1) * tamanho

	// total para paginação
	var total int
	if err := db.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM precos p "+where, args...).Scan(&total); err != nil {
		return erro(c, 500, err.Error())
	}

	args = append(args, tamanho, offset)
	sql := `
		SELECT p.id, p.produto_id, pr.nome, p.fornecedor_id, f.nome,
		       to_char(p.data, 'YYYY-MM-DD'), p.valor, p.criado_em
		FROM precos p
		JOIN produtos     pr ON pr.id = p.produto_id
		JOIN fornecedores f  ON f.id  = p.fornecedor_id
		` + where + `
		ORDER BY p.data DESC, p.id DESC
		LIMIT $` + strconv.Itoa(idx) + ` OFFSET $` + strconv.Itoa(idx+1)

	rows, err := db.Query(context.Background(), sql, args...)
	if err != nil {
		return erro(c, 500, err.Error())
	}
	defer rows.Close()

	lista := []Preco{}
	for rows.Next() {
		var p Preco
		if err := rows.Scan(&p.ID, &p.ProdutoID, &p.ProdutoNome,
			&p.FornecedorID, &p.FornecedorNome, &p.Data, &p.Valor, &p.CriadoEm); err != nil {
			return erro(c, 500, err.Error())
		}
		lista = append(lista, p)
	}
	return c.JSON(fiber.Map{
		"dados":   lista,
		"pagina":  pagina,
		"tamanho": tamanho,
		"total":   total,
	})
}

func criarPreco(c *fiber.Ctx) error {
	var entrada struct {
		ProdutoID    int     `json:"produto_id"`
		FornecedorID int     `json:"fornecedor_id"`
		Data         string  `json:"data"`
		Valor        float64 `json:"valor"`
	}
	if err := c.BodyParser(&entrada); err != nil {
		return erro(c, 400, "JSON inválido")
	}
	if entrada.ProdutoID == 0 || entrada.FornecedorID == 0 {
		return erro(c, 400, "produto_id e fornecedor_id são obrigatórios")
	}
	if entrada.Valor <= 0 {
		return erro(c, 400, "valor deve ser maior que zero")
	}
	if _, err := time.Parse("2006-01-02", entrada.Data); err != nil {
		return erro(c, 400, "data deve estar no formato YYYY-MM-DD")
	}

	var p Preco
	err := db.QueryRow(context.Background(), `
		INSERT INTO precos (produto_id, fornecedor_id, data, valor)
		VALUES ($1, $2, $3, $4)
		RETURNING id, produto_id, fornecedor_id, to_char(data,'YYYY-MM-DD'), valor, criado_em`,
		entrada.ProdutoID, entrada.FornecedorID, entrada.Data, entrada.Valor,
	).Scan(&p.ID, &p.ProdutoID, &p.FornecedorID, &p.Data, &p.Valor, &p.CriadoEm)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return erro(c, 409, "já existe um preço para esse fornecedor/produto/data")
		case "23503":
			return erro(c, 400, "produto ou fornecedor inexistente")
		}
	}
	if err != nil {
		return erro(c, 500, err.Error())
	}
	return c.Status(201).JSON(p)
}

// GET /precos/historico/:produto_id
// Série histórica: para cada (data, fornecedor) traz o valor.
func historicoPrecos(c *fiber.Ctx) error {
	produtoID, err := strconv.Atoi(c.Params("produto_id"))
	if err != nil || produtoID <= 0 {
		return erro(c, 400, "produto_id inválido")
	}

	rows, err := db.Query(context.Background(), `
		SELECT to_char(p.data,'YYYY-MM-DD'), f.id, f.nome, p.valor
		FROM precos p
		JOIN fornecedores f ON f.id = p.fornecedor_id
		WHERE p.produto_id = $1
		ORDER BY p.data ASC`, produtoID)
	if err != nil {
		return erro(c, 500, err.Error())
	}
	defer rows.Close()

	type ponto struct {
		Data           string  `json:"data"`
		FornecedorID   int     `json:"fornecedor_id"`
		FornecedorNome string  `json:"fornecedor_nome"`
		Valor          float64 `json:"valor"`
	}
	pontos := []ponto{}
	for rows.Next() {
		var p ponto
		if err := rows.Scan(&p.Data, &p.FornecedorID, &p.FornecedorNome, &p.Valor); err != nil {
			return erro(c, 500, err.Error())
		}
		pontos = append(pontos, p)
	}
	return c.JSON(pontos)
}

// GET /precos/comparativo?produto_id=X
// Para o produto, retorna o preço mais recente de cada fornecedor.
func compararPrecos(c *fiber.Ctx) error {
	produtoID, err := strconv.Atoi(c.Query("produto_id"))
	if err != nil || produtoID <= 0 {
		return erro(c, 400, "produto_id é obrigatório")
	}

	rows, err := db.Query(context.Background(), `
		SELECT DISTINCT ON (p.fornecedor_id)
		       f.id, f.nome, to_char(p.data,'YYYY-MM-DD'), p.valor
		FROM precos p
		JOIN fornecedores f ON f.id = p.fornecedor_id
		WHERE p.produto_id = $1
		ORDER BY p.fornecedor_id, p.data DESC`, produtoID)
	if err != nil {
		return erro(c, 500, err.Error())
	}
	defer rows.Close()

	type linha struct {
		FornecedorID   int     `json:"fornecedor_id"`
		FornecedorNome string  `json:"fornecedor_nome"`
		Data           string  `json:"data"`
		Valor          float64 `json:"valor"`
	}
	lista := []linha{}
	for rows.Next() {
		var l linha
		if err := rows.Scan(&l.FornecedorID, &l.FornecedorNome, &l.Data, &l.Valor); err != nil {
			return erro(c, 500, err.Error())
		}
		lista = append(lista, l)
	}
	return c.JSON(lista)
}
