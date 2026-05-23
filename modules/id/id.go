package id

import (
	"crypto/rand"
	"encoding/hex"
)

const defaultIDChars = 32

func Generate(length ...int) string {
	chars := defaultIDChars
	if len(length) > 0 && length[0] > 0 {
		chars = length[0]
	}
	bytesNeeded := (chars + 1) / 2
	b := make([]byte, bytesNeeded)
	if _, err := rand.Read(b); err != nil {
		panic("id: crypto/rand failed: " + err.Error())
	}
	out := hex.EncodeToString(b)
	if len(out) > chars {
		out = out[:chars]
	}
	return out
}