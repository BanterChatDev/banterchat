package admin

import (
	"time"
)

func (s *Service) emitUserKick(userID, kind, reason string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "admin_user_kick", map[string]string{
		"kind":   kind,
		"reason": reason,
	})
	s.hub.DisconnectUser(userID)
}

func (s *Service) emitUserSuspend(userID, username, reason string, until *time.Time, suspendedBy string) {
	if s.hub == nil {
		return
	}
	untilStr := ""
	if until != nil {
		untilStr = until.UTC().Format(time.RFC3339)
	}
	s.hub.EmitToSiteAdmins("admin_user_suspend", map[string]string{
		"user_id":      userID,
		"username":     username,
		"reason":       reason,
		"until":        untilStr,
		"suspended_by": suspendedBy,
	})
	s.emitUserKick(userID, "suspended", reason)
}

func (s *Service) emitUserUnsuspend(userID, username string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_unsuspend", map[string]string{
		"user_id":  userID,
		"username": username,
	})
}

func (s *Service) emitUserDelete(userID, username, deletedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_delete", map[string]string{
		"user_id":    userID,
		"username":   username,
		"deleted_by": deletedBy,
	})
	s.emitUserKick(userID, "deleted", "")
}

func (s *Service) emitUserForceLogout(userID, forcedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_force_logout", map[string]string{
		"user_id":   userID,
		"forced_by": forcedBy,
	})
	s.emitUserKick(userID, "force_logout", "")
}

func (s *Service) emitUserPromote(userID, username, promotedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_promote", map[string]string{
		"user_id":     userID,
		"username":    username,
		"promoted_by": promotedBy,
	})
}

func (s *Service) emitUserDemote(userID, username, demotedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_demote", map[string]string{
		"user_id":    userID,
		"username":   username,
		"demoted_by": demotedBy,
	})
}

func (s *Service) emitGuildSuspend(guildID, reason, suspendedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_guild_suspend", map[string]string{
		"guild_id":     guildID,
		"reason":       reason,
		"suspended_by": suspendedBy,
	})
}

func (s *Service) emitGuildUnsuspend(guildID, unsuspendedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_guild_unsuspend", map[string]string{
		"guild_id":       guildID,
		"unsuspended_by": unsuspendedBy,
	})
}

func (s *Service) emitGuildTerminate(guildID, terminatedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_guild_terminate", map[string]string{
		"guild_id":      guildID,
		"terminated_by": terminatedBy,
	})
}