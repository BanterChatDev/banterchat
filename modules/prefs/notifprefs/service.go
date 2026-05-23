package notifprefs

import (
	"ror/modules/db"
	"ror/modules/websocket"
)

type Service struct {
	db  *db.DB
	hub *websocket.Hub
}

func NewService(db *db.DB, hub *websocket.Hub) *Service {
	return &Service{db: db, hub: hub}
}