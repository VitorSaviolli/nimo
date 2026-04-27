package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func conectarBanco(databaseURL string) {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("erro ao conectar no banco: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("banco indisponível: %v", err)
	}
	db = pool
	log.Println("conectado ao Postgres")
}
