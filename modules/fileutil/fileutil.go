package fileutil

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/klauspost/compress/zstd"
	"ror/modules/encryption"
	"ror/modules/logger"
)

func Normalize(mimeType string) string {
	mt, _, err := mime.ParseMediaType(mimeType)
	if err != nil {
		return strings.ToLower(strings.TrimSpace(strings.SplitN(mimeType, ";", 2)[0]))
	}
	return mt
}

func Detect(data []byte) string {
	return http.DetectContentType(data)
}

const (
	MimeJPEG = "image/jpeg"
	MimePNG  = "image/png"
	MimeGIF  = "image/gif"
	MimeWebP = "image/webp"
	MimeAVIF = "image/avif"
	MimeSVG  = "image/svg+xml"
	MimeICO  = "image/x-icon"
	MimeICO2 = "image/vnd.microsoft.icon"
)

func IsImage(mimeType string) bool {
	return strings.HasPrefix(Normalize(mimeType), "image/")
}

func IsVideo(mimeType string) bool {
	return strings.HasPrefix(Normalize(mimeType), "video/")
}

func IsAudio(mimeType string) bool {
	return strings.HasPrefix(Normalize(mimeType), "audio/")
}

var allowedAvatarTypes = map[string]bool{
	MimeJPEG: true,
	MimePNG:  true,
	MimeGIF:  true,
	MimeWebP: true,
}

var AllowedAvatarNames string

var allowedProxyTypes = map[string]bool{
	MimePNG:  true,
	MimeJPEG: true,
	MimeGIF:  true,
	MimeWebP: true,
	MimeSVG:  true,
	MimeAVIF: true,
	MimeICO:  true,
	MimeICO2: true,
}

func IsAllowedAvatar(mimeType string) bool {
	return allowedAvatarTypes[Normalize(mimeType)]
}

var allowedSoundTypes = map[string]bool{
	"audio/mpeg":  true, // .mp3
	"audio/mp3":   true, // some browsers/sources
	"audio/wav":   true, // .wav
	"audio/x-wav": true, // older detection
	"audio/wave":  true, // alternate
	"audio/ogg":   true, // .ogg / .oga
	"audio/webm":  true, // .weba (Opus/Vorbis container)
}

func IsAllowedSound(mimeType string) bool {
	return allowedSoundTypes[Normalize(mimeType)]
}

func ValidateSoundFile(file *multipart.FileHeader) (string, bool) {
	src, err := file.Open()
	if err != nil {
		return "", false
	}
	defer src.Close()
	buf := make([]byte, 512)
	n, err := src.Read(buf)
	if err != nil || n == 0 {
		return "", false
	}
	detected := Detect(buf[:n])
	return detected, IsAllowedSound(detected)
}

func ValidateImageFile(file *multipart.FileHeader) (string, bool) {
	src, err := file.Open()
	if err != nil {
		return "", false
	}
	defer src.Close()
	buf := make([]byte, 512)
	n, err := src.Read(buf)
	if err != nil || n == 0 {
		return "", false
	}
	detected := Detect(buf[:n])
	return detected, IsAllowedAvatar(detected)
}

func IsAllowedProxy(mimeType string) bool {
	return allowedProxyTypes[Normalize(mimeType)]
}

var incompressiblePrefixes = []string{
	"video/", "audio/",
	MimeJPEG, MimeWebP, MimeGIF, MimeAVIF,
	"application/zip", "application/x-rar", "application/x-7z",
	"application/gzip", "application/x-bzip2", "application/zstd",
	"application/pdf",
}

func IsCompressible(mimeType string) bool {
	n := Normalize(mimeType)
	for _, p := range incompressiblePrefixes {
		if strings.HasPrefix(n, p) {
			return false
		}
	}
	return true
}

const (
	headerZstd = "ZS1"
	headerGzip = "GZ1"
)

var (
	zstdEnc *zstd.Encoder
	zstdDec *zstd.Decoder
)

func init() {
	zstdEnc, _ = zstd.NewWriter(nil, zstd.WithEncoderLevel(zstd.SpeedBestCompression))
	zstdDec, _ = zstd.NewReader(nil)

	names := make([]string, 0, len(allowedAvatarTypes))
	for t := range allowedAvatarTypes {
		names = append(names, strings.TrimPrefix(t, "image/"))
	}
	slices.Sort(names)
	AllowedAvatarNames = strings.Join(names, ", ")
}

func Compress(data []byte, mimeType string) []byte {
	if !IsCompressible(mimeType) {
		logger.Debug("compress skip", "type", mimeType, "size", fmtSize(len(data)), "reason", "incompressible")
		return data
	}
	compressed := zstdEnc.EncodeAll(data, nil)
	total := 3 + len(compressed)
	if total >= len(data) {
		logger.Debug("compress skip", "type", mimeType, "size", fmtSize(len(data)), "reason", "no gain")
		return data
	}
	logger.Debug("compressed", "type", mimeType, "before", fmtSize(len(data)), "after", fmtSize(total), "saved", fmt.Sprintf("%.1f%%", float64(len(data)-total)/float64(len(data))*100))
	return append([]byte(headerZstd), compressed...)
}

func fmtSize(n int) string {
	switch {
	case n >= 1<<20:
		return fmt.Sprintf("%.1fMB", float64(n)/float64(1<<20))
	case n >= 1<<10:
		return fmt.Sprintf("%.1fKB", float64(n)/float64(1<<10))
	default:
		return fmt.Sprintf("%dB", n)
	}
}

func Decompress(data []byte) ([]byte, error) {
	if len(data) < 3 {
		return data, nil
	}
	switch string(data[:3]) {
	case headerZstd:
		decoded, err := zstdDec.DecodeAll(data[3:], nil)
		if err != nil {
			return data, nil
		}
		return decoded, nil
	case headerGzip:
		r, err := gzip.NewReader(bytes.NewReader(data[3:]))
		if err != nil {
			return data, nil
		}
		defer r.Close()
		return io.ReadAll(r)
	}
	return data, nil
}

func Exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func SanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "\"", "")
	name = strings.ReplaceAll(name, "\\", "")
	return name
}

func HashBytes(data []byte) string {
	hash := sha256.Sum256(data)
	return base64.RawURLEncoding.EncodeToString(hash[:])
}

func EncryptAndWrite(data []byte, masterKey, storagePath string) error {
	encData, err := encryption.EncryptBytes(data, masterKey)
	if err != nil {
		return err
	}
	os.MkdirAll(filepath.Dir(storagePath), 0750)
	return os.WriteFile(storagePath, encData, 0600)
}

func ReadAndDecrypt(storagePath, masterKey string) ([]byte, error) {
	encData, err := os.ReadFile(storagePath)
	if err != nil {
		return nil, err
	}
	decrypted, err := encryption.DecryptBytes(encData, masterKey)
	if err != nil {
		return nil, err
	}
	return Decompress(decrypted)
}

func Remove(path string) {
	if path != "" {
		os.Remove(path)
	}
}

func EnsureDir(path string) {
	os.MkdirAll(path, 0750)
}

func StoragePath(basePath, userID, fileID string) string {
	return filepath.Join(basePath, userID, fileID+".enc")
}

const DefaultMaxImagePixels = 25_000_000

var ErrUploadTooLarge = errors.New("upload exceeds maximum size")

func ReadBounded(src io.Reader, maxSize int64) ([]byte, error) {
	if maxSize <= 0 {
		return nil, ErrUploadTooLarge
	}
	limited := io.LimitReader(src, maxSize+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > maxSize {
		return nil, ErrUploadTooLarge
	}
	return data, nil
}

func CheckImageDimensionBomb(width, height int, pixelCap int) error {
	if width <= 0 || height <= 0 {
		return nil
	}
	limit := pixelCap
	if limit <= 0 {
		limit = DefaultMaxImagePixels
	}
	if int64(width)*int64(height) > int64(limit) {
		return ErrUploadTooLarge
	}
	return nil
}