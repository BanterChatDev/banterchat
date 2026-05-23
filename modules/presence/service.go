package presence

import (
    "ror/modules/db"
    "ror/modules/websocket"
)

type Service struct {
    db  *db.DB
    hub *websocket.Hub
    BuildUser        func(userID string) map[string]interface{}
    BuildGuildMember func(guildID, userID string) map[string]interface{}
}

func NewService(database *db.DB, hub *websocket.Hub) *Service {
    s := &Service{db: database, hub: hub}
    hub.OnUserOnline = s.handleConnect
    hub.OnUserOffline = s.handleDisconnect
    return s
}

func (s *Service) GetManual(userID string) string {
    if s.db == nil {
        return ""
    }
    return getManual(s.db, userID)
}

func (s *Service) SetManual(userID, status string) error {
    if !isValidManual(status) {
        return ErrInvalidStatus
    }
    if err := setManual(s.db, userID, status); err != nil {
        return err
    }
    effective := status
    if status == "invisible" {
        effective = "offline"
    }
    s.emitStatusChange(userID, effective)
    s.fanGuilds(userID, s.hub.IsOnline(userID))
    return nil
}

func (s *Service) CountOnlineInGuild(guildID string) int {
    if s.hub == nil {
        return 0
    }
    idx := s.hub.GuildIndex()
    if idx == nil {
        return 0
    }
    online, _ := idx.Counts(guildID)
    return online
}

func (s *Service) handleConnect(userID string)    { s.broadcastConnectionChange(userID, true) }
func (s *Service) handleDisconnect(userID string) { s.broadcastConnectionChange(userID, false) }

func (s *Service) broadcastConnectionChange(userID string, online bool) {
    if online {
        s.emitOnline(userID, "")
    } else {
        s.emitOffline(userID, "")
    }
    s.fanGuilds(userID, online)
    s.emitAdminUserPresence(userID, online)
}

func (s *Service) fanGuilds(userID string, wasOnline bool) {
    idx := s.hub.GuildIndex()
    if idx == nil {
        return
    }
    guildIDs := idx.GuildsForUser(userID)
    if len(guildIDs) == 0 {
        return
    }
    for _, gid := range guildIDs {
        gid := gid
        onlineCount, total := idx.Counts(gid)
        go s.emitGuildPresence(gid, userID, wasOnline, onlineCount, total)
    }
}