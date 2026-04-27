package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://nimo:nimo@localhost:5432/nimo?sslmode=disable"
	}
	porta := os.Getenv("PORT")
	if porta == "" {
		porta = "8080"
	}

	conectarBanco(databaseURL)
	defer db.Close()

	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,OPTIONS",
	}))

	api := app.Group("/api/v1")

	api.Get("/produtos", listarProdutos)
	api.Post("/produtos", criarProduto)

	api.Get("/fornecedores", listarFornecedores)
	api.Post("/fornecedores", criarFornecedor)

	api.Get("/precos", listarPrecos)
	api.Post("/precos", criarPreco)
	api.Get("/precos/historico/:produto_id", historicoPrecos)
	api.Get("/precos/comparativo", compararPrecos)

	log.Printf("API ouvindo em :%s", porta)
	if err := app.Listen(":" + porta); err != nil {
		log.Fatal(err)
	}
}
