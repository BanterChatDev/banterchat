package keyfile

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"

	"ror/modules/websocket"
)

type Service struct {
	cfg Config
	hub *websocket.Hub
}

func NewService(cfg Config, hub *websocket.Hub) *Service {
	return &Service{cfg: cfg, hub: hub}
}

func (s *Service) Generate() []byte {
	b := make([]byte, s.cfg.KeyfileSize)
	if _, err := rand.Read(b); err != nil {
		panic("keyfile: crypto/rand failed: " + err.Error())
	}
	return b
}

func Hash(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func Verify(suppliedBytes []byte, storedHash string) bool {
	if storedHash == "" {
		return false
	}
	return Hash(suppliedBytes) == storedHash
}