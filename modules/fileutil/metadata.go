package fileutil

import "bytes"

func ClearMetadata(data []byte, mimeType string) []byte {
	if len(data) < 12 {
		return data
	}
	switch {
	case data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF:
		if out, ok := reencodeJPEG(data); ok {
			return out
		}
	case bytes.Equal(data[:8], pngSig):
		if out, ok := reencodePNG(data); ok {
			return out
		}
	case bytes.Equal(data[:6], gif87a) || bytes.Equal(data[:6], gif89a):
		if out, ok := reencodeGIF(data); ok {
			return out
		}
	case bytes.Equal(data[:4], riffSig) && bytes.Equal(data[8:12], webpSig):
		if out, ok := stripWebP(data); ok {
			return out
		}
	case bytes.Equal(data[4:8], ftypSig):
		if out, ok := stripMP4(data); ok {
			return out
		}
	}
	return data
}

var (
	pngSig  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	riffSig = []byte("RIFF")
	webpSig = []byte("WEBP")
	gif87a  = []byte("GIF87a")
	gif89a  = []byte("GIF89a")
	ftypSig = []byte("ftyp")
)