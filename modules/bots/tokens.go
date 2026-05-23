package bots

import (
	"ror/modules/encryption"
	"ror/modules/id"
)

func GenerateToken(appID string) string {
	randPart := id.Generate()
	prefix := appID
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	return "bt_" + prefix + "." + randPart
}

func HashToken(token, masterKey string) string {
	return encryption.HashIdentifier(token, masterKey)
}

func (s *Service) RotateToken(appID, ownerID string) (string, error) {
	row, err := s.getOwnedApp(appID, ownerID)
	if err != nil {
		return "", err
	}
	token := GenerateToken(appID)
	tokenHash := HashToken(token, s.masterKey)
	if err := s.db.UpdateBotAppTokenHash(appID, tokenHash); err != nil {
		return "", err
	}
	if s.hub != nil {
		s.hub.DisconnectBot(row.BotUserID, "token rotated")
		s.hub.EmitToRelatedUsers(row.BotUserID, "user_offline", map[string]string{"id": row.BotUserID})
	}
	return token, nil
}

func (s *Service) InvalidateToken(appID string) error {
	row, err := s.db.GetBotAppByID(appID)
	if err != nil {
		return err
	}
	throwaway := GenerateToken(appID)
	tokenHash := HashToken(throwaway, s.masterKey)
	if err := s.db.UpdateBotAppTokenHash(appID, tokenHash); err != nil {
		return err
	}
	if s.hub != nil {
		s.hub.DisconnectBot(row.BotUserID, "token invalidated")
	}
	return nil
}

func (s *Service) InvalidateTokenByBotUserID(botUserID string) error {
	app, err := s.db.GetBotAppByBotUserID(botUserID)
	if err != nil || app == nil {
		return err
	}
	return s.InvalidateToken(app.ID)
}

func (s *Service) LookupByToken(rawToken string) (*App, error) {
	tokenHash := HashToken(rawToken, s.masterKey)
	row, err := s.db.GetBotAppByTokenHash(tokenHash)
	if err != nil {
		return nil, ErrInvalidToken
	}
	if s.db.IsUserBanned(row.BotUserID) || s.db.IsSuspendedByID(row.BotUserID) {
		return nil, ErrInvalidToken
	}
	app := rowToApp(row)
	return &app, nil
}