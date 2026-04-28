package main

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// Valida o algoritmo dos dígitos verificadores do CNPJ.
func TestValidarCNPJ(t *testing.T) {
	casos := []struct {
		entrada string
		valido  bool
	}{
		{"34.274.233/0001-02", true},  // Petrobras Distribuidora
		{"33337122000127", true},       // Ipiranga, sem máscara
		{"33.453.598/0001-23", true},   // Raízen
		{"00000000000000", false},      // todos zeros
		{"11111111111111", false},      // todos iguais
		{"12345678901234", false},      // dígitos verificadores errados
		{"123", false},                  // curto demais
		{"", false},                     // vazio
	}
	for _, c := range casos {
		t.Run(c.entrada, func(t *testing.T) {
			d := limparCNPJ(c.entrada)
			if got := validarCNPJ(d); got != c.valido {
				t.Errorf("CNPJ %q: esperava %v, recebeu %v", c.entrada, c.valido, got)
			}
		})
	}
}

// Teste simples sobre o handler de validação de criarPreco — não exige banco.
// Verifica que entradas inválidas retornam 400 com mensagem clara.
func TestCriarPreco_ValidacaoEntrada(t *testing.T) {
	app := fiber.New()
	app.Post("/precos", criarPreco)

	casos := []struct {
		nome     string
		corpo    string
		esperaMsg string
	}{
		{"json invalido", `{"produto_id":`, "JSON inválido"},
		{"sem produto", `{"fornecedor_id":1,"data":"2026-04-27","valor":5.5}`, "produto_id e fornecedor_id são obrigatórios"},
		{"valor zero", `{"produto_id":1,"fornecedor_id":1,"data":"2026-04-27","valor":0}`, "valor deve ser maior que zero"},
		{"data ruim", `{"produto_id":1,"fornecedor_id":1,"data":"27-04-2026","valor":5.5}`, "data deve estar no formato YYYY-MM-DD"},
	}

	for _, ca := range casos {
		t.Run(ca.nome, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/precos", strings.NewReader(ca.corpo))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("erro inesperado: %v", err)
			}
			if resp.StatusCode != 400 {
				t.Fatalf("status esperado 400, recebido %d", resp.StatusCode)
			}
			body, _ := io.ReadAll(resp.Body)
			var resposta map[string]string
			_ = json.Unmarshal(body, &resposta)
			if resposta["erro"] != ca.esperaMsg {
				t.Fatalf("mensagem esperada %q, recebida %q", ca.esperaMsg, resposta["erro"])
			}
		})
	}
}
