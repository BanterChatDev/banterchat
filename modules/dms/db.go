package dms

import (
	"time"

	"ror/modules/id"
)

type Conversation struct {
	ID        string `json:"id"`
	User1ID   string `json:"user1_id"`
	User2ID   string `json:"user2_id"`
	CreatedAt string `json:"created_at"`
}

func canonicalOrder(a, b string) (string, string) {
	if a < b {
		return a, b
	}
	return b, a
}

func (s *Service) getOrCreateConversation(userA, userB string) (*Conversation, error) {
	u1, u2 := canonicalOrder(userA, userB)
	cID, cU1, cU2, cAt, err := s.db.GetConversation(u1, u2)
	if err == nil {
		return &Conversation{ID: cID, User1ID: cU1, User2ID: cU2, CreatedAt: cAt}, nil
	}
	conv := Conversation{ID: id.Generate(), User1ID: u1, User2ID: u2, CreatedAt: time.Now().UTC().Format(time.RFC3339)}
	if err := s.db.InsertConversation(conv.ID, conv.User1ID, conv.User2ID, conv.CreatedAt); err != nil {
		return s.getOrCreateConversation(userA, userB)
	}
	return &conv, nil
}

func (s *Service) listConversations(userID string) ([]Conversation, error) {
	dbRows, err := s.db.ListConversations(userID)
	if err != nil {
		return nil, err
	}
	convs := make([]Conversation, len(dbRows))
	for i, r := range dbRows {
		convs[i] = Conversation{ID: r[0], User1ID: r[1], User2ID: r[2], CreatedAt: r[3]}
	}
	return convs, nil
}

func (s *Service) IsParticipant(userID, convID string) bool {
	return s.db.IsParticipant(userID, convID)
}

func (s *Service) GetConversation(convID string) (*Conversation, error) {
	cID, cU1, cU2, cAt, err := s.db.GetConversationByID(convID)
	if err != nil {
		return nil, err
	}
	return &Conversation{ID: cID, User1ID: cU1, User2ID: cU2, CreatedAt: cAt}, nil
}