package channels

import (
	"time"

	"ror/modules/encryption"
	"ror/modules/id"
)

type Channel struct {
	ID                    string              `json:"id"`
	GuildID               string              `json:"guild_id"`
	Name                  string              `json:"name"`
	Description           string              `json:"description"`
	Position              int                 `json:"position"`
	CategoryID            string              `json:"category_id"`
	Type                  string              `json:"type"`
	CreatedBy             string              `json:"created_by"`
	CreatedAt             time.Time           `json:"created_at"`
	SlowmodeSeconds       int                 `json:"slowmode_seconds"`
	HasThreads            bool                `json:"has_threads"`
	HasArchivedThreads    bool                `json:"has_archived_threads"`
	PermissionOverrides   []ChannelPermission `json:"permission_overrides"`
}

type ChannelPermission struct {
	ChannelID string `json:"channel_id"`
	RoleID    string `json:"role_id"`
	RoleName  string `json:"role_name,omitempty"`
	RoleColor string `json:"role_color,omitempty"`
	Allow     int64  `json:"allow"`
	Deny      int64  `json:"deny"`
}

// listChannels (unscoped) + listAllDecrypted removed. All channel listing
// is per-guild — use listChannelsInGuild(guildID).

func (s *Service) getChannel(id string) (*Channel, error) {
	r, err := s.db.GetChannel(id)
	if err != nil { return nil, err }
	return &Channel{ID: r.ID, GuildID: r.GuildID, Name: r.Name, Description: r.Description, Position: r.Position, CategoryID: r.CategoryID, Type: r.Type, CreatedBy: r.CreatedBy, CreatedAt: r.CreatedAt, SlowmodeSeconds: r.SlowmodeSeconds}, nil
}

func (s *Service) createChannel(name, description, createdBy, categoryID, masterKey, chType string) (*Channel, error) {
	if chType != "voice" {
		chType = "text"
	}
	id := id.Generate()
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	encDesc := encryption.EncryptField(description, masterKey)
	err := s.db.InsertChannel(id, encName, nameHash, encDesc, categoryID, createdBy, chType)
	if err != nil {
		return nil, err
	}
	return &Channel{ID: id, Name: name, Description: description, CategoryID: categoryID, Type: chType, CreatedBy: createdBy, CreatedAt: time.Now()}, nil
}

func (s *Service) createChannelInGuild(guildID, name, description, createdBy, categoryID, masterKey, chType string) (*Channel, error) {
	if chType != "voice" {
		chType = "text"
	}
	cid := id.Generate()
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	encDesc := encryption.EncryptField(description, masterKey)
	err := s.db.InsertChannelInGuild(cid, guildID, encName, nameHash, encDesc, categoryID, createdBy, chType)
	if err != nil {
		return nil, err
	}
	return &Channel{ID: cid, GuildID: guildID, Name: name, Description: description, CategoryID: categoryID, Type: chType, CreatedBy: createdBy, CreatedAt: time.Now()}, nil
}

func (s *Service) deleteChannel(id string) error {
	return s.db.DeleteChannel(id)
}

func (s *Service) updateChannel(id, name, description string, position int, categoryID, masterKey string) error {
	encName := encryption.EncryptField(name, masterKey)
	nameHash := encryption.HashIdentifier(name, masterKey)
	encDesc := encryption.EncryptField(description, masterKey)
	return s.db.UpdateChannel(id, encName, nameHash, encDesc, position, categoryID)
}

func (s *Service) getChannelPerms(channelID string) ([]ChannelPermission, error) {
	dbRows, err := s.db.GetChannelPerms(channelID)
	if err != nil { return nil, err }
	out := make([]ChannelPermission, len(dbRows))
	for i, r := range dbRows {
		out[i] = ChannelPermission{ChannelID: r.ChannelID, RoleID: r.RoleID, RoleName: r.RoleName, RoleColor: r.RoleColor, Allow: r.Allow, Deny: r.Deny}
	}
	return out, nil
}

func (s *Service) setChannelPerm(channelID, roleID string, allow, deny int64) error {
	return s.db.SetChannelPerm(channelID, roleID, allow, deny)
}

func (s *Service) loadOverrides(channels []Channel) []Channel {
	for i := range channels {
		overrides, _ := s.getChannelPerms(channels[i].ID)
		if overrides == nil {
			overrides = []ChannelPermission{}
		}
		channels[i].PermissionOverrides = overrides
	}
	return channels
}

func (s *Service) decryptOverrideRoleNames(channels []Channel) {
	for i := range channels {
		for j := range channels[i].PermissionOverrides {
			channels[i].PermissionOverrides[j].RoleName = encryption.DecryptField(channels[i].PermissionOverrides[j].RoleName, s.masterKey)
		}
	}
}

// listChannelsInGuild returns only channels belonging to guildID with the
// same decrypt/override pipeline as listAllDecrypted. Used by the per-guild
// List handler.
func (s *Service) listChannelsInGuild(guildID string) ([]Channel, error) {
	rows, err := s.db.ListChannelsByGuild(guildID)
	if err != nil { return nil, err }
	if rows == nil { return []Channel{}, nil }
	channels := make([]Channel, len(rows))
	textIDs := make([]string, 0, len(rows))
	for i, r := range rows {
		channels[i] = Channel{
			ID: r.ID, GuildID: r.GuildID, Name: r.Name, Description: r.Description,
			Position: r.Position, CategoryID: r.CategoryID, Type: r.Type,
			CreatedBy: r.CreatedBy, CreatedAt: r.CreatedAt,
			SlowmodeSeconds: r.SlowmodeSeconds,
		}
		if r.Type == "text" {
			textIDs = append(textIDs, r.ID)
		}
	}
	if len(textIDs) > 0 {
		flags := s.db.ThreadFlagsByParents(textIDs)
		for i := range channels {
			if f, ok := flags[channels[i].ID]; ok {
				channels[i].HasThreads = f.HasActive
				channels[i].HasArchivedThreads = f.HasArchived
			}
		}
	}
	channels = s.loadOverrides(channels)
	channels = s.decryptChannels(channels)
	s.decryptOverrideRoleNames(channels)
	return channels, nil
}

func (s *Service) getDecryptedWithOverrides(id string) (*Channel, error) {
	ch, err := s.getChannel(id)
	if err != nil { return nil, err }
	s.decryptChannel(ch)
	overrides, _ := s.getChannelPerms(id)
	if overrides == nil { overrides = []ChannelPermission{} }
	for i := range overrides {
		overrides[i].RoleName = encryption.DecryptField(overrides[i].RoleName, s.masterKey)
	}
	ch.PermissionOverrides = overrides
	return ch, nil
}