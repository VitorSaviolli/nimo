package main

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

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
