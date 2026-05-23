package db

import (
	"database/sql"
	"time"
	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
	OnGuildMembershipChange func(guildID string)
}

func Open(url string) (*DB, error) {
	conn, err := sql.Open("postgres", url)
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(10)
	conn.SetConnMaxLifetime(5 * 60 * time.Second)
	return &DB{DB: conn}, nil
}