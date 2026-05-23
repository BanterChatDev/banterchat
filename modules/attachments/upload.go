package attachments

import (
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/encryption"
	"ror/modules/fileutil"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/permissions"
)

const maxWaveformBytes = 512

func parseVoiceMeta(c echo.Context, mimeType string) voiceMeta {
	vm := voiceMeta{}
	durStr := strings.TrimSpace(c.FormValue("duration_secs"))
	wf := strings.TrimSpace(c.FormValue("waveform"))
	if durStr == "" && wf == "" {
		return vm
	}
	if !strings.HasPrefix(strings.ToLower(mimeType), "audio/") {
		return vm
	}
	if dur, err := strconv.ParseFloat(durStr, 64); err == nil && dur > 0 {
		if dur > 600 {
			dur = 600
		}
		vm.DurationSecs = dur
	}
	if len(wf) > 0 && len(wf) <= maxWaveformBytes {
		vm.Waveform = wf
	}
	return vm
}

func (s *Service) Upload(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.FormValue("channel_id")
	if channelID == "" {
		return c.JSON(400, echo.Map{"error": ErrMissingChannel.Error()})
	}
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	if !permissions.HasPerm(perms, permissions.PermAttachFiles) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(400, echo.Map{"error": ErrNoFile.Error()})
	}
	if err := ValidateFile(file, s.cfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	defer src.Close()
	data, rerr := fileutil.ReadBounded(src, s.cfg.MaxSize)
	if rerr != nil {
		if rerr == fileutil.ErrUploadTooLarge {
			return c.JSON(413, echo.Map{"error": ErrFileTooLarge.Error()})
		}
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	normalizedMime := normalizeMime(file.Filename, file.Header.Get("Content-Type"))
	vm := parseVoiceMeta(c, normalizedMime)
	attID, preview, width, height, err := s.storeAttachmentWithVoice(channelID, userID, file.Filename, normalizedMime, data, vm)
	if err != nil {
		logger.Error("attachment store", "error", err, "channel", channelID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	resp := echo.Map{
		"id":        attID,
		"filename":  file.Filename,
		"mime_type": normalizedMime,
		"size":      int64(len(data)),
	}
	if width > 0 && height > 0 {
		resp["width"] = width
		resp["height"] = height
	}
	if preview != nil {
		resp["file_preview"] = preview
	}
	if vm.DurationSecs > 0 {
		resp["duration_secs"] = vm.DurationSecs
	}
	if vm.Waveform != "" {
		resp["waveform"] = vm.Waveform
	}
	return c.JSON(201, resp)
}

func (s *Service) Probe(c echo.Context) error {
	userID := c.Get("userID").(string)
	channelID := c.FormValue("channel_id")
	if channelID == "" {
		return c.JSON(400, echo.Map{"error": ErrMissingChannel.Error()})
	}
	perms := permissions.ResolveChannelPerms(s.db, userID, channelID)
	if !permissions.HasPerm(perms, permissions.PermAttachFiles) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	fileHash := strings.TrimSpace(c.FormValue("file_hash"))
	if fileHash == "" || len(fileHash) > 128 {
		return c.JSON(400, echo.Map{"error": "missing file_hash"})
	}
	filename := c.FormValue("filename")
	if filename == "" {
		return c.JSON(400, echo.Map{"error": "missing filename"})
	}
	mimeType := normalizeMime(filename, c.FormValue("mime_type"))
	sizeStr := strings.TrimSpace(c.FormValue("size"))
	size, _ := strconv.ParseInt(sizeStr, 10, 64)
	master, err := s.db.FindAttachmentMasterByHash(fileHash)
	if err != nil || master == nil || master.StoragePath == "" {
		return c.JSON(404, echo.Map{"found": false})
	}
	if !fileutil.Exists(master.StoragePath) {
		s.db.MarkBlobMissing(master.StoragePath)
		return c.JSON(404, echo.Map{"found": false})
	}
	vm := parseVoiceMeta(c, mimeType)
	flags := vm.Flags
	if flags == 0 {
		flags = master.Flags
	}
	durationSecs := vm.DurationSecs
	if durationSecs == 0 {
		durationSecs = master.DurationSecs
	}
	waveform := vm.Waveform
	if waveform == "" {
		waveform = master.Waveform
	}
	attID := id.Generate()
	guildID := s.db.GetChannelGuildID(channelID)
	encFilename := encryption.EncryptField(filename, s.masterKey)
	encMime := encryption.EncryptField(mimeType, s.masterKey)
	if err := s.db.InsertAttachment(attID, guildID, channelID, userID, encFilename, encMime, size, master.Width, master.Height, fileHash, 0, master.StoragePath, master.FilePreview, flags, durationSecs, waveform); err != nil {
		logger.Error("attachment probe insert", "error", err, "channel", channelID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.db.IncrementRefCount(fileHash)
	resp := echo.Map{
		"id":        attID,
		"filename":  filename,
		"mime_type": mimeType,
		"size":      size,
	}
	if master.Width > 0 && master.Height > 0 {
		resp["width"] = master.Width
		resp["height"] = master.Height
	}
	if durationSecs > 0 {
		resp["duration_secs"] = durationSecs
	}
	if waveform != "" {
		resp["waveform"] = waveform
	}
	return c.JSON(201, resp)
}

const userFileMaxSize = 1 * 1024 * 1024

func (s *Service) UploadUserFile(c echo.Context) error {
	userID := c.Get("userID").(string)
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(400, echo.Map{"error": ErrNoFile.Error()})
	}
	if file.Size <= 0 {
		return c.JSON(400, echo.Map{"error": "file too large"})
	}
	mime, ok := fileutil.ValidateSoundFile(file)
	if !ok {
		return c.JSON(400, echo.Map{"error": "unsupported audio format"})
	}
	src, err := file.Open()
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	defer src.Close()
	data, rerr := fileutil.ReadBounded(src, userFileMaxSize)
	if rerr != nil {
		if rerr == fileutil.ErrUploadTooLarge {
			return c.JSON(413, echo.Map{"error": "file too large"})
		}
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	attID, _, _, _, err := s.storeAttachment("", userID, file.Filename, mime, data)
	if err != nil {
		logger.Error("user attachment store", "error", err, "user", userID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(201, echo.Map{
		"id":        attID,
		"mime_type": mime,
		"size":      int64(len(data)),
	})
}