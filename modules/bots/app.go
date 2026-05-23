package bots

import (
	"fmt"
	"strings"

	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/usernames"
)

type App struct {
	ID            string `json:"id"`
	OwnerID       string `json:"owner_id"`
	BotUserID     string `json:"bot_user_id"`
	Name          string `json:"name"`
	Discriminator string `json:"discriminator"`
	DisplayTag    string `json:"display_tag"`
	Description   string `json:"description"`
	DisplayName   string `json:"display_name"`
	Bio           string `json:"bio"`
	AvatarID      string `json:"avatar_id"`
	BannerID      string `json:"banner_id"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type UpdateAppReq struct {
	Name        string
	Description string
	DisplayName *string
	Bio         *string
}

func rowToApp(r *db.BotAppRow) App {
	return App{
		ID:          r.ID,
		OwnerID:     r.OwnerID,
		BotUserID:   r.BotUserID,
		Name:        r.Name,
		Description: r.Description,
		CreatedAt:   r.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   r.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (s *Service) rowToAppWithDiscriminator(r *db.BotAppRow) App {
	app := rowToApp(r)
	u, err := s.users.GetUserByID(r.BotUserID)
	if err == nil && u != nil {
		app.Discriminator = u.BotDiscriminator
		if app.Discriminator != "" {
			app.DisplayTag = fmt.Sprintf("%s#%s", app.Name, app.Discriminator)
		} else {
			app.DisplayTag = app.Name
		}
		app.DisplayName = s.users.DecryptDisplayName(u)
		app.Bio = s.users.DecryptBio(u)
	} else {
		app.DisplayTag = app.Name
	}
	if s.GetAvatarID != nil {
		app.AvatarID = s.GetAvatarID(r.BotUserID)
	}
	if s.GetBannerID != nil {
		app.BannerID = s.GetBannerID(r.BotUserID)
	}
	return app
}

func (s *Service) getOwnedApp(appID, ownerID string) (*db.BotAppRow, error) {
	row, err := s.db.GetBotAppByID(appID)
	if err != nil {
		return nil, ErrNotFound
	}
	if row.OwnerID != ownerID {
		return nil, ErrNotOwner
	}
	return row, nil
}

func (s *Service) CreateApp(ownerID, name string) (App, string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return App{}, "", ErrInvalidName
	}
	if err := usernames.ValidateBot(name, s.authCfg.MinUsername, s.authCfg.MaxUsername, s.blacklist); err != nil {
		return App{}, "", wrapInvalidName(err.Error())
	}
	count, err := s.db.CountBotAppsByOwner(ownerID)
	if err != nil {
		return App{}, "", err
	}
	if count >= s.cfg.MaxAppsPerUser {
		return App{}, "", ErrMaxApps
	}
	nameLower := strings.ToLower(name)
	botNameHash := encryption.HashIdentifier(nameLower, s.masterKey)
	discriminator, err := s.users.NextBotDiscriminator(botNameHash)
	if err != nil {
		return App{}, "", err
	}
	appID := id.Generate()
	botUserID := id.Generate()
	userKey := encryption.GenerateKey()
	encUserKey, err := encryption.EncryptUserKey(userKey, s.masterKey)
	if err != nil {
		logger.Error("bots: encrypt user key failed", "error", err)
		return App{}, "", err
	}
	encName, err := encryption.Encrypt(name, userKey)
	if err != nil {
		logger.Error("bots: encrypt name failed", "error", err)
		return App{}, "", err
	}
	if err := s.users.CreateBotUser(botUserID, encName, botNameHash, discriminator, encUserKey); err != nil {
		logger.Error("bots: insert bot user failed", "error", err)
		return App{}, "", err
	}
	token := GenerateToken(appID)
	if token == "" {
		return App{}, "", ErrInvalidToken
	}
	tokenHash := HashToken(token, s.masterKey)
	if err := s.db.InsertBotApp(appID, ownerID, botUserID, name, tokenHash); err != nil {
		logger.Error("bots: insert app failed", "error", err)
		return App{}, "", err
	}
	row, err := s.db.GetBotAppByID(appID)
	if err != nil {
		return App{}, "", err
	}
	app := s.rowToAppWithDiscriminator(row)
	if s.hub != nil {
		s.hub.EmitToSiteAdmins("bot_app_create", map[string]interface{}{
			"id":          app.ID,
			"owner_id":    app.OwnerID,
			"bot_user_id": app.BotUserID,
			"name":        app.Name,
		})
	}
	return app, token, nil
}

func (s *Service) ListApps(ownerID string) ([]App, error) {
	rows, err := s.db.ListBotAppsByOwner(ownerID)
	if err != nil {
		return nil, err
	}
	out := make([]App, len(rows))
	for i := range rows {
		out[i] = s.rowToAppWithDiscriminator(&rows[i])
	}
	return out, nil
}

func (s *Service) GetApp(appID, ownerID string) (App, error) {
	row, err := s.getOwnedApp(appID, ownerID)
	if err != nil {
		return App{}, err
	}
	return s.rowToAppWithDiscriminator(row), nil
}

func (s *Service) GetAppPublic(appID string) (App, error) {
	row, err := s.db.GetBotAppByID(appID)
	if err != nil {
		return App{}, ErrNotFound
	}
	return s.rowToAppWithDiscriminator(row), nil
}

func (s *Service) UpdateApp(appID, ownerID string, req UpdateAppReq) (App, error) {
	row, err := s.getOwnedApp(appID, ownerID)
	if err != nil {
		return App{}, err
	}
	name := req.Name
	renamed := false
	if name == "" {
		name = row.Name
	} else if name != row.Name {
		if err := usernames.ValidateBot(name, s.authCfg.MinUsername, s.authCfg.MaxUsername, s.blacklist); err != nil {
			return App{}, wrapInvalidName(err.Error())
		}
		renamed = true
	}
	description := strings.TrimSpace(req.Description)
	if len(description) > 400 {
		return App{}, ErrInvalidDesc
	}
	if err := s.db.UpdateBotAppName(appID, name, description); err != nil {
		return App{}, err
	}
	if renamed {
		if err := s.applyBotRename(row.BotUserID, name); err != nil {
			logger.Error("bots: rename propagate failed", "error", err, "app_id", appID)
			return App{}, err
		}
	}
	if s.ApplyUserProfile != nil && (req.DisplayName != nil || req.Bio != nil) {
		if _, _, err := s.ApplyUserProfile(row.BotUserID, ProfilePatch{
			DisplayName: req.DisplayName,
			Bio:         req.Bio,
		}); err != nil {
			return App{}, err
		}
	}
	row, err = s.db.GetBotAppByID(appID)
	if err != nil {
		return App{}, err
	}
	app := s.rowToAppWithDiscriminator(row)
	if renamed {
		if resp, rerr := s.users.BuildUserResponse(row.BotUserID, row.BotUserID); rerr == nil {
			s.emitBotUpdate(row.BotUserID, resp)
		}
	}
	return app, nil
}

func (s *Service) applyBotRename(botUserID, newName string) error {
	nameLower := strings.ToLower(newName)
	newHash := encryption.HashIdentifier(nameLower, s.masterKey)
	discriminator, err := s.users.NextBotDiscriminator(newHash)
	if err != nil {
		return err
	}
	uRow, err := s.users.GetUserByID(botUserID)
	if err != nil {
		return err
	}
	userKey, _ := encryption.DecryptUserKey(uRow.EncryptedKey, s.masterKey)
	encName := newName
	if userKey != "" {
		if enc, err := encryption.Encrypt(newName, userKey); err == nil {
			encName = enc
		}
	}
	return s.db.UpdateUserBotUsername(botUserID, encName, newHash, discriminator)
}

func (s *Service) DeleteApp(appID, ownerID string) error {
	row, err := s.getOwnedApp(appID, ownerID)
	if err != nil {
		return err
	}
	guildIDs, _ := s.db.ListGuildIDsForUser(row.BotUserID)
	if err := s.db.DeleteBotApp(appID); err != nil {
		return err
	}
	if s.hub != nil {
		s.hub.DisconnectBot(row.BotUserID, "application deleted")
		for _, gid := range guildIDs {
			s.hub.EmitToGuild(gid, "guild_member_remove", map[string]string{
				"guild_id": gid,
				"user_id":  row.BotUserID,
			})
		}
	}
	return nil
}