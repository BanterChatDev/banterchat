package messages

import (
	"ror/modules/db"
	"ror/modules/users"
)

type IdentityRef struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarID    string
	Flair       string
	IsBot       bool
	RoleID      string
	Role        string
	RoleColor   string
}

type IdentityBatch struct {
	minis        map[string]users.DecryptedUserMini
	avatars      map[string]string
	rolesByGuild map[string]map[string]db.RoleMini
	nicksByGuild map[string]map[string]string
	guildOfChan  map[string]string
}

func (s *Service) ResolveIdentities(userIDs []string, channelIDs []string) IdentityBatch {
	b := IdentityBatch{guildOfChan: make(map[string]string, len(channelIDs))}
	for _, chID := range channelIDs {
		if chID == "" {
			continue
		}
		if _, ok := b.guildOfChan[chID]; ok {
			continue
		}
		b.guildOfChan[chID] = s.db.GetChannelGuildID(chID)
	}
	if len(userIDs) > 0 {
		b.minis = s.users.DecryptUserMinisByIDs(userIDs)
		b.avatars = s.db.GetAvatarsByUsersBatch(userIDs)
	}
	guilds := make(map[string]struct{})
	for _, gid := range b.guildOfChan {
		if gid != "" {
			guilds[gid] = struct{}{}
		}
	}
	if len(guilds) > 0 && len(userIDs) > 0 {
		b.rolesByGuild = make(map[string]map[string]db.RoleMini, len(guilds))
		b.nicksByGuild = make(map[string]map[string]string, len(guilds))
		for gid := range guilds {
			b.rolesByGuild[gid] = s.db.GetTopRolesForUsersInGuild(userIDs, gid)
			b.nicksByGuild[gid] = s.db.GetGuildMemberNicknames(gid, userIDs)
		}
	}
	return b
}

func (b IdentityBatch) GuildIDFor(channelID string) string {
	return b.guildOfChan[channelID]
}

func (b IdentityBatch) Get(userID string) IdentityRef {
	ref := IdentityRef{UserID: userID}
	if mini, ok := b.minis[userID]; ok {
		ref.Username = mini.Username
		ref.DisplayName = mini.DisplayName
		ref.IsBot = mini.IsBot
		ref.Flair = mini.Flair
	}
	ref.AvatarID = b.avatars[userID]
	return ref
}

func (b IdentityBatch) GetIn(userID, channelID string) IdentityRef {
	ref := b.Get(userID)
	gid := b.GuildIDFor(channelID)
	if gid == "" {
		return ref
	}
	if nmap, ok := b.nicksByGuild[gid]; ok {
		if nick, ok := nmap[userID]; ok && nick != "" {
			ref.DisplayName = nick
		}
	}
	if rmap, ok := b.rolesByGuild[gid]; ok {
		if rm, ok := rmap[userID]; ok {
			ref.RoleID = rm.ID
			ref.Role = rm.Name
			ref.RoleColor = rm.Color
		}
	}
	return ref
}

func (s *Service) ResolveIdentity(userID, channelID string) IdentityRef {
	if userID == "" {
		return IdentityRef{}
	}
	channels := []string{}
	if channelID != "" {
		channels = []string{channelID}
	}
	b := s.ResolveIdentities([]string{userID}, channels)
	if channelID != "" {
		return b.GetIn(userID, channelID)
	}
	return b.Get(userID)
}