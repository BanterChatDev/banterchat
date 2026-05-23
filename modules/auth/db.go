package auth

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

type Session struct {
	ID        string
	UserID    string
	IP        string
	UserAgent string
	ExpiresAt time.Time
	CreatedAt time.Time
}

func generateSessionID() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic("auth: crypto/rand failed: " + err.Error())
	}
	return hex.EncodeToString(b)
}

func (s *Service) createSession(userID, ip, userAgent string) (*Session, error) {
	id := generateSessionID()
	expiresAt := time.Now().Add(SessionDuration)
	encIP := s.hashIP(ip)
	if err := s.db.InsertSession(id, userID, encIP, userAgent, expiresAt); err != nil {
		return nil, err
	}
	return &Session{ID: id, UserID: userID, IP: encIP, UserAgent: userAgent, ExpiresAt: expiresAt, CreatedAt: time.Now()}, nil
}

func (s *Service) getSession(sessionID string) (*Session, error) {
	row, err := s.db.GetSession(sessionID, time.Now())
	if err != nil {
		return nil, err
	}
	return &Session{ID: row.ID, UserID: row.UserID, IP: row.IP, UserAgent: row.UserAgent, ExpiresAt: row.ExpiresAt, CreatedAt: row.CreatedAt}, nil
}

func (s *Service) getUserSessions(userID string) ([]Session, error) {
	dbRows, err := s.db.ListUserSessions(userID, time.Now())
	if err != nil {
		return nil, err
	}
	sessions := make([]Session, len(dbRows))
	for i, r := range dbRows {
		sessions[i] = Session{ID: r.ID, UserID: r.UserID, IP: r.IP, UserAgent: r.UserAgent, ExpiresAt: r.ExpiresAt, CreatedAt: r.CreatedAt}
	}
	return sessions, nil
}

func (s *Service) cleanExpiredSessions() {
	s.db.CleanExpiredSessions(time.Now())
}

func (s *Service) nukeOtherSessions(userID, keepSessionID string) {
	sessions, _ := s.getUserSessions(userID)
	for _, sess := range sessions {
		if sess.ID != keepSessionID {
			s.hub.DisconnectSession(sess.ID)
		}
	}
	s.db.DeleteUserSessionsExcept(userID, keepSessionID)
	s.emitSessionChange(userID)
}

func (s *Service) nukeAllSessions(userID string) {
	sessions, _ := s.getUserSessions(userID)
	for _, sess := range sessions {
		s.hub.DisconnectSession(sess.ID)
	}
	s.db.DeleteSessionsByUser(userID)
	s.emitSessionChange(userID)
}

func (s *Service) countRecentRegistrations(ip string) int {
	return s.db.CountRecentRegistrations(ip, time.Now().Add(-24*time.Hour))
}

func (s *Service) logRegistration(ip string) {
	s.db.LogRegistration(ip)
}