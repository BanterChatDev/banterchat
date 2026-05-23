package attachments

import (
	"ror/modules/fileutil"
)

type attachmentRef struct {
	id, fileHash, storagePath string
}

func (s *Service) collectRefs(column, value string) []attachmentRef {
	dbRows, err := s.db.CollectAttachmentRefs(column, value)
	if err != nil {
		return nil
	}
	refs := make([]attachmentRef, len(dbRows))
	for i, r := range dbRows {
		refs[i] = attachmentRef{id: r.ID, fileHash: r.FileHash, storagePath: r.StoragePath}
	}
	return refs
}

func (s *Service) cleanupRefs(refs []attachmentRef) {
	for _, r := range refs {
		if r.fileHash == "" {
			continue
		}
		n, err := s.db.DecrementRefCount(r.fileHash)
		if err != nil {
			continue
		}
		if n > 0 {
			if s.db.CountActiveRefs(r.fileHash) == 0 && r.storagePath != "" {
				fileutil.Remove(r.storagePath)
			}
		}
	}
}

func (s *Service) DeleteByID(attID string) {
	if attID == "" {
		return
	}
	refs := s.collectRefs("id", attID)
	s.cleanupRefs(refs)
	s.db.DeleteAttachmentByID(attID)
}

func (s *Service) DeleteByMessage(messageID string) {
	refs := s.collectRefs("message_id", messageID)
	s.cleanupRefs(refs)
	s.db.DeleteAttachmentsByMessage(messageID)
}

func (s *Service) DeleteByChannel(channelID string) {
	refs := s.collectRefs("channel_id", channelID)
	s.cleanupRefs(refs)
	s.db.DeleteAttachmentsByChannel(channelID)
}