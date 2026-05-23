package threads

import (
	"time"

	"ror/modules/encryption"
	"ror/modules/id"
)

type Thread struct {
	ID              string    `json:"id"`
	ParentChannelID string    `json:"parent_channel_id"`
	GuildID         string    `json:"guild_id"`
	Name            string    `json:"name"`
	OwnerID         string    `json:"owner_id"`
	ParentMessageID string    `json:"parent_message_id,omitempty"`
	Archived        bool      `json:"archived"`
	MessageCount    int       `json:"message_count"`
	CreatedAt       time.Time `json:"created_at"`
}

func (s *Service) createThread(parentChannelID, guildID, name, ownerID, parentMessageID string) (*Thread, error) {
	tid := id.Generate()
	encName := encryption.EncryptField(name, s.masterKey)
	nameHash := encryption.HashIdentifier(name, s.masterKey)
	if err := s.db.InsertThread(tid, parentChannelID, guildID, encName, nameHash, ownerID, parentMessageID, 1440); err != nil {
		return nil, err
	}
	return &Thread{
		ID:              tid,
		ParentChannelID: parentChannelID,
		GuildID:         guildID,
		Name:            name,
		OwnerID:         ownerID,
		ParentMessageID: parentMessageID,
		CreatedAt:       time.Now(),
	}, nil
}

func (s *Service) listThreads(parentChannelID string, includeArchived bool) ([]Thread, error) {
	rows, err := s.db.ListThreadsByParent(parentChannelID, includeArchived)
	if err != nil {
		return nil, err
	}
	out := make([]Thread, 0, len(rows))
	for _, r := range rows {
		out = append(out, Thread{
			ID:              r.ID,
			ParentChannelID: parentChannelID,
			GuildID:         r.GuildID,
			Name:            encryption.DecryptField(r.Name, s.masterKey),
			CreatedAt:       r.CreatedAt,
		})
	}
	return out, nil
}

func (s *Service) getThread(threadID string) (*Thread, error) {
	parent, guildID, ownerID, parentMessageID, archived, found := s.db.GetThreadMeta(threadID)
	if !found {
		return nil, ErrThreadNotFound
	}
	row, err := s.db.GetChannel(threadID)
	if err != nil {
		return nil, ErrThreadNotFound
	}
	return &Thread{
		ID:              threadID,
		ParentChannelID: parent,
		GuildID:         guildID,
		Name:            encryption.DecryptField(row.Name, s.masterKey),
		OwnerID:         ownerID,
		ParentMessageID: parentMessageID,
		Archived:        archived,
		CreatedAt:       row.CreatedAt,
	}, nil
}