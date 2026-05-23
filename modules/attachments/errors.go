package attachments

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"

	"ror/modules/apperr"
	"ror/modules/fileutil"
)

var (
	ErrNoFile         = errors.New("no file provided")
	ErrMissingChannel = errors.New("channel_id is required")
	ErrNotFound       = errors.New("attachment not found")
	ErrFileTooLarge   = errors.New("file too large")

	ErrNotAllowed  = apperr.ErrNotAllowed
	ErrServerError = apperr.ErrServerError
)

func ValidateFile(file *multipart.FileHeader, cfg Config) error {
	if file.Size > cfg.MaxSize {
		return fmt.Errorf("file too large (max %d MB)", cfg.MaxSize/(1024*1024))
	}
	src, err := file.Open()
	if err != nil {
		return nil
	}
	defer src.Close()
	buf := make([]byte, 512)
	n, _ := src.Read(buf)
	if n == 0 {
		return nil
	}
	detected := fileutil.Detect(buf[:n])
	if fileutil.IsImage(detected) {
		src.Seek(0, 0)
		full := make([]byte, file.Size)
		if _, rerr := io.ReadFull(src, full); rerr == nil {
			if w, h, ok := fileutil.DecodeImageDimensions(full); ok {
				if w > cfg.MaxImageDimension || h > cfg.MaxImageDimension {
					return fmt.Errorf("image too large (max %dx%d pixels)", cfg.MaxImageDimension, cfg.MaxImageDimension)
				}
				if perr := fileutil.CheckImageDimensionBomb(w, h, cfg.MaxImagePixels); perr != nil {
					return ErrFileTooLarge
				}
			}
		}
	}
	return nil
}