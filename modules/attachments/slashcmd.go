package attachments

import (
	"os"

	"ror/modules/embed"
	"ror/modules/fileutil"
)

func (s *Service) CreateFromFile(channelID, userID, filePath, filename, mimeType string) (string, *embed.FilePreview, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", nil, err
	}
	defer fileutil.Remove(filePath)
	attID, preview, _, _, err := s.storeAttachment(channelID, userID, filename, mimeType, data)
	return attID, preview, err
}

func (s *Service) StoreFromWebhook(channelID, userID, filename, mimeType string, data []byte) (string, error) {
	attID, _, _, _, err := s.storeAttachment(channelID, userID, filename, mimeType, data)
	return attID, err
}