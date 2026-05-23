package webhooks

import (
	"encoding/json"
	"io"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/embed"
)

type ExecuteBody struct {
	Content   string        `json:"content"`
	Username  string        `json:"username"`
	AvatarURL string        `json:"avatar_url"`
	AvatarID  string        `json:"avatar_id"`
	TTS       bool          `json:"tts"`
	Embeds    []embed.Embed `json:"embeds"`
}

func (s *Service) parseExecuteRequest(c echo.Context, channelID, ownerUserID string) (ExecuteBody, []string, error) {
	var body ExecuteBody
	ct := c.Request().Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "multipart/form-data") {
		if err := c.Bind(&body); err != nil {
			return body, nil, ErrInvalidRequest
		}
		return body, nil, nil
	}
	form, err := c.MultipartForm()
	if err != nil {
		return body, nil, ErrInvalidRequest
	}
	if pj := c.FormValue("payload_json"); pj != "" {
		if err := json.Unmarshal([]byte(pj), &body); err != nil {
			return body, nil, ErrInvalidRequest
		}
	}
	files := form.File["file"]
	for k, v := range form.File {
		if k != "file" {
			files = append(files, v...)
		}
	}
	if len(files) > s.attCfg.MaxFileCount {
		return body, nil, ErrInvalidRequest
	}
	if s.OnStoreAttachment == nil {
		if len(files) > 0 {
			return body, nil, ErrServerError
		}
		return body, nil, nil
	}
	attachmentIDs := make([]string, 0, len(files))
	for _, fh := range files {
		if fh.Size > s.attCfg.MaxSize {
			return body, nil, ErrInvalidRequest
		}
		src, oerr := fh.Open()
		if oerr != nil {
			return body, nil, ErrServerError
		}
		data, rerr := io.ReadAll(src)
		src.Close()
		if rerr != nil {
			return body, nil, ErrServerError
		}
		mime := fh.Header.Get("Content-Type")
		attID, serr := s.OnStoreAttachment(channelID, ownerUserID, fh.Filename, mime, data)
		if serr != nil {
			return body, nil, ErrServerError
		}
		attachmentIDs = append(attachmentIDs, attID)
	}
	return body, attachmentIDs, nil
}