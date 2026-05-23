package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"sync"
)

var ErrDecryptionFailed = errors.New("decryption failed")

func GenerateKey() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed: " + err.Error())
	}
	return base64.StdEncoding.EncodeToString(b)
}

var derivedKeys sync.Map

func DeriveKeyFromMaster(masterKey string) []byte {
	if cached, ok := derivedKeys.Load(masterKey); ok {
		return cached.([]byte)
	}
	hash := sha256.Sum256([]byte(masterKey))
	key := make([]byte, 32)
	copy(key, hash[:])
	derivedKeys.Store(masterKey, key)
	return key
}

var userKeyCache sync.Map

func HashIdentifier(value, masterKey string) string {
	salt := DeriveKeyFromMaster(masterKey)
	hash := sha256.Sum256(append([]byte(value), salt...))
	return base64.RawURLEncoding.EncodeToString(hash[:])[:16]
}

func encryptWithKey(plaintext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func decryptWithKey(ciphertext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, ErrDecryptionFailed
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	return plaintext, nil
}

func EncryptUserKey(userKeyBase64, masterKey string) (string, error) {
	derivedKey := DeriveKeyFromMaster(masterKey)
	ciphertext, err := encryptWithKey([]byte(userKeyBase64), derivedKey)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptUserKey(encryptedKeyBase64, masterKey string) (string, error) {
	if encryptedKeyBase64 == "" {
		return "", ErrDecryptionFailed
	}
	if cached, ok := userKeyCache.Load(encryptedKeyBase64); ok {
		return cached.(string), nil
	}
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedKeyBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	plaintext, err := decryptWithKey(ciphertext, derivedKey)
	if err != nil {
		return "", err
	}
	result := string(plaintext)
	userKeyCache.Store(encryptedKeyBase64, result)
	return result, nil
}

func EncryptWithMaster(plaintext, masterKey string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	ciphertext, err := encryptWithKey([]byte(plaintext), derivedKey)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptWithMaster(ciphertextBase64, masterKey string) (string, error) {
	if ciphertextBase64 == "" {
		return "", nil
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	plaintext, err := decryptWithKey(ciphertext, derivedKey)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func Encrypt(plaintext, keyBase64 string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return "", err
	}
	ciphertext, err := encryptWithKey([]byte(plaintext), key)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(ciphertextBase64, keyBase64 string) (string, error) {
	if ciphertextBase64 == "" {
		return "", nil
	}
	key, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	plaintext, err := decryptWithKey(ciphertext, key)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func EncryptField(value, masterKey string) string {
	if value == "" {
		return ""
	}
	enc, err := EncryptWithMaster(value, masterKey)
	if err != nil {
		return value
	}
	return enc
}

func DecryptField(value, masterKey string) string {
	if value == "" {
		return ""
	}
	plain, err := DecryptWithMaster(value, masterKey)
	if err != nil {
		return value
	}
	return plain
}

const chunkSize = 64 * 1024

func EncryptBytes(data []byte, masterKey string) ([]byte, error) {
	if len(data) == 0 {
		return data, nil
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	if len(data) <= chunkSize {
		return encryptWithKey(data, derivedKey)
	}
	return encryptChunked(data, derivedKey)
}

func DecryptBytes(data []byte, masterKey string) ([]byte, error) {
	if len(data) == 0 {
		return data, nil
	}
	derivedKey := DeriveKeyFromMaster(masterKey)
	if len(data) <= chunkSize+28+4 {
		return decryptWithKey(data, derivedKey)
	}
	plain, err := decryptChunked(data, derivedKey)
	if err != nil {
		return decryptWithKey(data, derivedKey)
	}
	return plain, nil
}

func encryptChunked(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSize := gcm.NonceSize()
	overhead := gcm.Overhead()
	chunkEnc := nonceSize + chunkSize + overhead
	numChunks := (len(data) + chunkSize - 1) / chunkSize
	out := make([]byte, 4, 4+numChunks*chunkEnc)
	out[0] = 'C'
	out[1] = 'H'
	out[2] = 'K'
	out[3] = 1
	for off := 0; off < len(data); off += chunkSize {
		end := off + chunkSize
		if end > len(data) {
			end = len(data)
		}
		nonce := make([]byte, nonceSize)
		if _, err := rand.Read(nonce); err != nil {
			return nil, err
		}
		sealed := gcm.Seal(nonce, nonce, data[off:end], nil)
		out = append(out, sealed...)
	}
	return out, nil
}

func decryptChunked(data, key []byte) ([]byte, error) {
	if len(data) < 4 || data[0] != 'C' || data[1] != 'H' || data[2] != 'K' || data[3] != 1 {
		return nil, ErrDecryptionFailed
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrDecryptionFailed
	}
	nonceSize := gcm.NonceSize()
	overhead := gcm.Overhead()
	chunkEnc := nonceSize + chunkSize + overhead
	payload := data[4:]
	out := make([]byte, 0, len(payload))
	for len(payload) > 0 {
		sz := chunkEnc
		if sz > len(payload) {
			sz = len(payload)
		}
		chunk := payload[:sz]
		payload = payload[sz:]
		if len(chunk) < nonceSize {
			return nil, ErrDecryptionFailed
		}
		nonce := chunk[:nonceSize]
		ct := chunk[nonceSize:]
		plain, err := gcm.Open(nil, nonce, ct, nil)
		if err != nil {
			return nil, ErrDecryptionFailed
		}
		out = append(out, plain...)
	}
	return out, nil
}

