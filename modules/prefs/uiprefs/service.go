package uiprefs

import (
	"ror/modules/db"
	"ror/modules/websocket"
)

type Service struct {
	db               *db.DB
	hub              *websocket.Hub
	masterKey        string
	DeleteAttachment func(attID string)
}

func NewService(db *db.DB, hub *websocket.Hub, masterKey string) *Service {
	return &Service{db: db, hub: hub, masterKey: masterKey}
}