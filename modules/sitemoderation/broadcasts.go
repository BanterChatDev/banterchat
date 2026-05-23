package sitemoderation

import (
	"time"

	"ror/modules/users"
)

func (s *Service) emitUserTerminated(userID, reason, terminatedBy, terminatedByUsername string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitTo(userID, "user_terminated", map[string]string{
		"reason":                 reason,
		"terminated_by":          terminatedBy,
		"terminated_by_username": terminatedByUsername,
		"created_at":             time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Service) emitUserTerminate(userID, username string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_terminate", map[string]string{"user_id": userID, "username": username})
}

func (s *Service) emitUserRestore(userID, username string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToRelatedUsers(userID, "user_restore", map[string]string{"user_id": userID, "username": username})
}

func (s *Service) emitAdminUserTerminate(userID, username, reason, terminatedBy string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_terminate", map[string]string{
		"user_id":       userID,
		"username":      username,
		"reason":        reason,
		"terminated_by": terminatedBy,
		"created_at":    time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Service) emitAdminUserRestore(userID, username string) {
	if s.hub == nil {
		return
	}
	s.hub.EmitToSiteAdmins("admin_user_restore", map[string]string{
		"user_id":  userID,
		"username": username,
	})
}

func (s *Service) emitUserMaskedUpdate(targetID string) {
	if s.hub == nil {
		return
	}
	payload := map[string]any{
		"id":            targetID,
		"username":      users.DeletedUserName,
		"discriminator": users.DeletedUserTag,
		"display_name":  "",
		"bio":           "",
		"avatar_id":     "",
		"banner_id":     "",
		"banner_crop":   "",
		"flair":         "",
		"banned":        true,
	}
	s.hub.EmitToRelatedUsers(targetID, "user_update", payload)
}

func (s *Service) emitUserUnmaskedUpdate(targetID string) {
	if s.hub == nil || s.BuildUserResponse == nil {
		return
	}
	resp, err := s.BuildUserResponse(targetID, targetID)
	if err != nil {
		return
	}
	s.hub.EmitToRelatedUsers(targetID, "user_update", resp)
}