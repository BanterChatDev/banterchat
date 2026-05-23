package attachments

import (
	"encoding/json"
	"mime"
	"path/filepath"
	"strings"

	"ror/modules/embed"
	"ror/modules/encryption"
	"ror/modules/fileutil"
	"ror/modules/id"
)

var extMimeOverrides = map[string]string{
	".mov":  "video/quicktime",
	".mkv":  "video/x-matroska",
	".m4v":  "video/x-m4v",
	".webm": "video/webm",
	".opus": "audio/opus",
	".m4a":  "audio/mp4",
	".heic": "image/heic",
	".heif": "image/heif",
	".avif": "image/avif",
}

func normalizeMime(filename, mimeType string) string {
	mt := strings.TrimSpace(strings.ToLower(mimeType))
	if mt != "" && mt != "application/octet-stream" && mt != "binary/octet-stream" {
		return mimeType
	}
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		return mimeType
	}
	if forced, ok := extMimeOverrides[ext]; ok {
		return forced
	}
	if guess := mime.TypeByExtension(ext); guess != "" {
		if i := strings.Index(guess, ";"); i != -1 {
			guess = guess[:i]
		}
		return strings.TrimSpace(guess)
	}
	return mimeType
}

func (s *Service) buildPreview(filename, mimeType string, data []byte, size int64) (*embed.FilePreview, string) {
	preview := embed.BuildFilePreview(filename, mimeType, size, data)
	if preview == nil {
		return nil, ""
	}
	raw, err := json.Marshal(preview)
	if err != nil {
		return preview, ""
	}
	return preview, encryption.EncryptField(string(raw), s.masterKey)
}

type voiceMeta struct {
	Flags        int64
	DurationSecs float64
	Waveform     string
}

func (s *Service) storeAttachment(channelID, userID, filename, mimeType string, data []byte) (string, *embed.FilePreview, int, int, error) {
	return s.storeAttachmentWithVoice(channelID, userID, filename, mimeType, data, voiceMeta{})
}

func (s *Service) storeAttachmentWithVoice(channelID, userID, filename, mimeType string, data []byte, vm voiceMeta) (string, *embed.FilePreview, int, int, error) {
	mimeType = normalizeMime(filename, mimeType)
	fileHash := fileutil.HashBytes(data)
	data = fileutil.ClearMetadata(data, mimeType)
	attID := id.Generate()
	guildID := s.db.GetChannelGuildID(channelID)
	encFilename := encryption.EncryptField(filename, s.masterKey)
	encMime := encryption.EncryptField(mimeType, s.masterKey)
	originalSize := int64(len(data))
	preview, encPreview := s.buildPreview(filename, mimeType, data, originalSize)

	width, height := 0, 0
	if fileutil.IsImage(mimeType) {
		if w, h, ok := fileutil.DecodeImageDimensions(data); ok {
			width, height = w, h
		}
	}

	existingID, storagePath, err := s.findByHash(fileHash)
	if err == nil && existingID != "" && storagePath != "" {
		if fileutil.Exists(storagePath) {
			err = s.db.InsertAttachment(attID, guildID, channelID, userID, encFilename, encMime, originalSize, width, height, fileHash, 0, storagePath, encPreview, vm.Flags, vm.DurationSecs, vm.Waveform)
			if err != nil {
				return "", nil, 0, 0, err
			}
			s.db.IncrementRefCount(fileHash)
			return attID, preview, width, height, nil
		}
		s.db.MarkBlobMissing(storagePath)
	}

	compressed := fileutil.Compress(data, mimeType)
	storagePath = fileutil.StoragePath(s.cfg.StoragePath, userID, attID)
	if err := fileutil.EncryptAndWrite(compressed, s.masterKey, storagePath); err != nil {
		return "", nil, 0, 0, err
	}
	err = s.db.InsertAttachment(attID, guildID, channelID, userID, encFilename, encMime, originalSize, width, height, fileHash, 1, storagePath, encPreview, vm.Flags, vm.DurationSecs, vm.Waveform)
	if err != nil {
		fileutil.Remove(storagePath)
		return "", nil, 0, 0, err
	}
	return attID, preview, width, height, nil
}