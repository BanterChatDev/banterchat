package attachments

import (
	"ror/modules/encryption"
)

func (s *Service) LinkToMessage(attID, messageID string) {
	s.db.LinkAttachmentToMessage(attID, messageID)
}

func (s *Service) decryptPreview(enc string) string {
	if enc == "" {
		return ""
	}
	return encryption.DecryptField(enc, s.masterKey)
}

func (s *Service) GetByMessage(messageID string) []Attachment {
	dbRows, err := s.db.GetAttachmentsByMessage(messageID)
	if err != nil {
		return nil
	}
	atts := make([]Attachment, len(dbRows))
	for i, r := range dbRows {
		atts[i] = Attachment{
			ID:           r.ID,
			Filename:     encryption.DecryptField(r.Filename, s.masterKey),
			MimeType:     encryption.DecryptField(r.MimeType, s.masterKey),
			Size:         r.Size,
			Width:        r.Width,
			Height:       r.Height,
			FilePreview:  s.decryptPreview(r.FilePreview),
			Flags:        r.Flags,
			DurationSecs: r.DurationSecs,
			Waveform:     r.Waveform,
		}
	}
	return atts
}

func (s *Service) GetByMessages(messageIDs []string) map[string][]Attachment {
	dbMap, err := s.db.GetAttachmentsByMessages(messageIDs)
	if err != nil {
		return nil
	}
	result := make(map[string][]Attachment, len(dbMap))
	for msgID, rows := range dbMap {
		atts := make([]Attachment, len(rows))
		for i, r := range rows {
			atts[i] = Attachment{
				ID:           r.ID,
				Filename:     encryption.DecryptField(r.Filename, s.masterKey),
				MimeType:     encryption.DecryptField(r.MimeType, s.masterKey),
				Size:         r.Size,
				Width:        r.Width,
				Height:       r.Height,
				FilePreview:  s.decryptPreview(r.FilePreview),
				Flags:        r.Flags,
				DurationSecs: r.DurationSecs,
				Waveform:     r.Waveform,
			}
		}
		result[msgID] = atts
	}
	return result
}

func (s *Service) findByHash(fileHash string) (string, string, error) {
	return s.db.FindAttachmentByHash(fileHash)
}