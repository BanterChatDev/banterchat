package attachments

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/encryption"
	"ror/modules/fileutil"
)

type attachmentPageData struct {
	Title       string
	Description string
	PageURL     string
	RawURL      string
	Mime        string
	IsImage     bool
	IsVideo     bool
	IsAudio     bool
	OGType      string
	TwitterCard string
}

const attachmentPathPrefix = "/api/v1/attachments/"

func attachmentRawURL(c echo.Context, attID string) string {
	return fmt.Sprintf("%s://%s%s%s", c.Scheme(), c.Request().Host, attachmentPathPrefix, attID)
}

func attachmentViewURL(c echo.Context, attID string) string {
	return attachmentRawURL(c, attID) + "/view"
}

func isMediaMime(mime string) bool {
	return fileutil.IsImage(mime) || fileutil.IsVideo(mime) || fileutil.IsAudio(mime)
}

func buildAttachmentPageData(c echo.Context, attID, filename, mime string) attachmentPageData {
	title := filename
	if title == "" {
		title = "Attachment"
	}
	description := title
	if normalized := fileutil.Normalize(mime); normalized != "" {
		description = description + " · " + normalized
	}
	data := attachmentPageData{
		Title:       title,
		Description: description,
		PageURL:     attachmentViewURL(c, attID),
		RawURL:      attachmentRawURL(c, attID),
		Mime:        mime,
		IsImage:     fileutil.IsImage(mime),
		IsVideo:     fileutil.IsVideo(mime),
		IsAudio:     fileutil.IsAudio(mime),
		OGType:      "website",
		TwitterCard: "summary",
	}
	if data.IsImage {
		data.OGType = "image"
		data.TwitterCard = "summary_large_image"
	}
	if data.IsVideo {
		data.OGType = "video.other"
		data.TwitterCard = "player"
	}
	if data.IsAudio {
		data.OGType = "music.song"
	}
	return data
}

func (s *Service) serveAttachmentPage(c echo.Context, attID, filename, mime string) error {
	if s.pageTemplate == nil {
		return c.JSON(500, echo.Map{"error": "attachment template not configured"})
	}
	var buf bytes.Buffer
	if err := s.pageTemplate.Execute(&buf, buildAttachmentPageData(c, attID, filename, mime)); err != nil {
		return err
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.HTMLBlob(200, buf.Bytes())
}

func (s *Service) Download(c echo.Context) error {
	attID := c.Param("id")
	_, encFilename, encMime, _, storagePath, err := s.db.GetAttachment(attID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}

	mime := encryption.DecryptField(encMime, s.masterKey)
	filename := encryption.DecryptField(encFilename, s.masterKey)

	diskPath := storagePath
	if diskPath == "" {
		ownerID := s.db.GetAttachmentOwner(attID)
		diskPath = fileutil.StoragePath(s.cfg.StoragePath, ownerID, attID)
	}
	data, err := fileutil.ReadAndDecrypt(diskPath, s.masterKey)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}

	disposition := "attachment"
	if isMediaMime(mime) {
		disposition = "inline"
	}
	c.Response().Header().Set("Content-Disposition", disposition+"; filename=\""+fileutil.SanitizeFilename(filename)+"\"")
	c.Response().Header().Set("Accept-Ranges", "bytes")
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return serveBytes(c, data, mime)
}

func (s *Service) View(c echo.Context) error {
	attID := c.Param("id")
	_, encFilename, encMime, _, _, err := s.db.GetAttachment(attID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	mime := encryption.DecryptField(encMime, s.masterKey)
	filename := encryption.DecryptField(encFilename, s.masterKey)
	return s.serveAttachmentPage(c, attID, filename, mime)
}

func serveBytes(c echo.Context, data []byte, mime string) error {
	total := len(data)
	rangeHeader := c.Request().Header.Get("Range")
	if rangeHeader == "" {
		c.Response().Header().Set("Content-Length", strconv.Itoa(total))
		return c.Blob(200, mime, data)
	}
	rangeHeader = strings.TrimPrefix(rangeHeader, "bytes=")
	parts := strings.SplitN(rangeHeader, "-", 2)
	if len(parts) != 2 {
		return c.Blob(200, mime, data)
	}
	start := 0
	end := total - 1
	if parts[0] != "" {
		s, err := strconv.Atoi(parts[0])
		if err == nil {
			start = s
		}
	}
	if parts[1] != "" {
		e, err := strconv.Atoi(parts[1])
		if err == nil {
			end = e
		}
	}
	if start > end || start >= total {
		c.Response().Header().Set("Content-Range", "bytes */"+strconv.Itoa(total))
		return c.NoContent(416)
	}
	if end >= total {
		end = total - 1
	}
	c.Response().Header().Set("Content-Range", "bytes "+strconv.Itoa(start)+"-"+strconv.Itoa(end)+"/"+strconv.Itoa(total))
	c.Response().Header().Set("Content-Length", strconv.Itoa(end-start+1))
	c.Response().Header().Set("Content-Type", mime)
	c.Response().WriteHeader(206)
	_, err := c.Response().Write(data[start : end+1])
	return err
}