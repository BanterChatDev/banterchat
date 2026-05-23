package emojis

import (
	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"mime/multipart"
	"regexp"
	"strings"

	"ror/modules/fileutil"
)

var nameRe = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

func ValidateName(name string, cfg Config) error {
	name = strings.TrimSpace(name)
	if len(name) < cfg.NameMinLen || len(name) > cfg.NameMaxLen {
		return ErrInvalidName
	}
	if !nameRe.MatchString(name) {
		return ErrInvalidName
	}
	return nil
}

var allowedEmojiMimes = map[string]bool{
	fileutil.MimePNG:  true,
	fileutil.MimeGIF:  true,
	fileutil.MimeWebP: true,
	fileutil.MimeJPEG: true,
}

type Validated struct {
	Data     []byte
	MIME     string
	Animated bool
}

func ValidateFile(file *multipart.FileHeader, cfg Config) (*Validated, error) {
	if file.Size <= 0 {
		return nil, ErrTooLarge
	}
	src, err := file.Open()
	if err != nil {
		return nil, ErrServerError
	}
	defer src.Close()
	buf, rerr := fileutil.ReadBounded(src, cfg.MaxSize)
	if rerr != nil {
		if rerr == fileutil.ErrUploadTooLarge {
			return nil, ErrTooLarge
		}
		return nil, ErrServerError
	}
	mime := fileutil.Detect(buf[:min(mimeSniffBytes, len(buf))])
	if !allowedEmojiMimes[fileutil.Normalize(mime)] {
		return nil, ErrInvalidType
	}
	w, h, animated, derr := decodeDimensions(buf, mime)
	if derr != nil {
		return nil, ErrInvalidType
	}
	if w > 0 && h > 0 {
		if w < cfg.MinDimension || h < cfg.MinDimension {
			return nil, ErrInvalidSize
		}
		if perr := fileutil.CheckImageDimensionBomb(w, h, cfg.MaxPixels); perr != nil {
			return nil, ErrInvalidSize
		}
		aspect := float64(w) / float64(h)
		if aspect < cfg.AspectMin || aspect > cfg.AspectMax {
			return nil, ErrInvalidAspect
		}
	}
	return &Validated{Data: buf, MIME: mime, Animated: animated}, nil
}

func decodeDimensions(data []byte, mime string) (int, int, bool, error) {
	m := fileutil.Normalize(mime)
	if m == fileutil.MimeWebP {
		w, h, animated := parseWebPHeader(data)
		return w, h, animated, nil
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return 0, 0, false, err
	}
	animated := m == fileutil.MimeGIF
	return cfg.Width, cfg.Height, animated, nil
}

// parseWebPHeader inspects the RIFF + VP8/VP8L/VP8X chunks to find the
// canvas width/height and whether the file uses the VP8X "extended" form
// with the ANIM bit set. Returns 0,0,false on malformed input — callers
// then skip the dimension check rather than reject (we don't want a failure
// to read a valid WebP to block the upload entirely).
func parseWebPHeader(data []byte) (int, int, bool) {
	if len(data) < 30 {
		return 0, 0, false
	}
	if string(data[0:4]) != "RIFF" || string(data[8:12]) != "WEBP" {
		return 0, 0, false
	}
	chunk := data[12:16]
	body := data[20:]
	switch string(chunk) {
	case "VP8 ":
		if len(body) < 10 {
			return 0, 0, false
		}
		w := int(body[6]) | int(body[7]&0x3f)<<8
		h := int(body[8]) | int(body[9]&0x3f)<<8
		return w, h, false
	case "VP8L":
		if len(body) < 5 {
			return 0, 0, false
		}
		b := body[1:]
		w := (int(b[0]) | int(b[1]&0x3f)<<8) + 1
		h := (int(b[1]>>6) | int(b[2])<<2 | int(b[3]&0x0f)<<10) + 1
		return w, h, false
	case "VP8X":
		if len(body) < 10 {
			return 0, 0, false
		}
		flags := body[0]
		animated := flags&0x02 != 0
		w := (int(body[4]) | int(body[5])<<8 | int(body[6])<<16) + 1
		h := (int(body[7]) | int(body[8])<<8 | int(body[9])<<16) + 1
		return w, h, animated
	}
	return 0, 0, false
}

const mimeSniffBytes = 512