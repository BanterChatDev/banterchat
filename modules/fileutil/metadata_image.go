package fileutil

import (
	"bytes"
	"encoding/binary"
	"image/gif"
	"image/jpeg"
	"image/png"
)

const jpegReencodeQuality = 90

func reencodeJPEG(data []byte) ([]byte, bool) {
	img, err := jpeg.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, false
	}
	out := bytes.NewBuffer(make([]byte, 0, len(data)))
	if err := jpeg.Encode(out, img, &jpeg.Options{Quality: jpegReencodeQuality}); err != nil {
		return nil, false
	}
	return out.Bytes(), true
}

func reencodePNG(data []byte) ([]byte, bool) {
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, false
	}
	out := bytes.NewBuffer(make([]byte, 0, len(data)))
	enc := png.Encoder{CompressionLevel: png.DefaultCompression}
	if err := enc.Encode(out, img); err != nil {
		return nil, false
	}
	return out.Bytes(), true
}

func reencodeGIF(data []byte) ([]byte, bool) {
	g, err := gif.DecodeAll(bytes.NewReader(data))
	if err != nil {
		img, errSingle := gif.Decode(bytes.NewReader(data))
		if errSingle != nil {
			return nil, false
		}
		out := bytes.NewBuffer(make([]byte, 0, len(data)))
		if err := gif.Encode(out, img, nil); err != nil {
			return nil, false
		}
		return out.Bytes(), true
	}
	out := bytes.NewBuffer(make([]byte, 0, len(data)))
	if err := gif.EncodeAll(out, g); err != nil {
		return nil, false
	}
	return out.Bytes(), true
}

var webpKeepChunks = map[string]bool{
	"VP8 ": true,
	"VP8L": true,
	"VP8X": true,
	"ALPH": true,
	"ANIM": true,
	"ANMF": true,
	"ICCP": true,
}

func stripWebP(data []byte) ([]byte, bool) {
	body := bytes.NewBuffer(make([]byte, 0, len(data)))
	body.Write(data[8:12])
	i := 12
	for i+8 <= len(data) {
		chunkType := string(data[i : i+4])
		chunkLen := int(binary.LittleEndian.Uint32(data[i+4 : i+8]))
		if chunkLen < 0 || i+8+chunkLen > len(data) {
			return nil, false
		}
		padded := chunkLen
		if padded%2 == 1 {
			padded++
		}
		if i+8+padded > len(data) {
			padded = chunkLen
		}
		end := i + 8 + padded
		if chunkType == "VP8X" {
			body.Write(data[i : i+8])
			flags := data[i+8]
			flags &^= 0x08
			flags &^= 0x04
			body.WriteByte(flags)
			body.Write(data[i+9 : end])
		} else if webpKeepChunks[chunkType] {
			body.Write(data[i:end])
		}
		i = end
	}
	bodyBytes := body.Bytes()
	out := bytes.NewBuffer(make([]byte, 0, len(bodyBytes)+8))
	out.Write(riffSig)
	var sizeBuf [4]byte
	binary.LittleEndian.PutUint32(sizeBuf[:], uint32(len(bodyBytes)))
	out.Write(sizeBuf[:])
	out.Write(bodyBytes)
	return out.Bytes(), true
}