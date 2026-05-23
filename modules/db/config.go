package db

import (
	"os"
	"strconv"
)

type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func DefaultConfig() Config {
	return Config{
		Host:     envOr("DB_HOST", "127.0.0.1"),
		Port:     envInt("DB_PORT", 5433),
		User:     envOr("DB_USER", "banter"),
		Password: os.Getenv("DB_PASSWORD"),
		Database: envOr("DB_NAME", "banter"),
		SSLMode:  envOr("DB_SSLMODE", "disable"),
	}
}