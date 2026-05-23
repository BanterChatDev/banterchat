package threads

import (
	"strings"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/logger"
)

func (s *Service) Create(c echo.Context) error {
	parentID := c.Param("channelId")
	userID := c.Get("userID").(string)

	parent, err := s.db.GetChannel(parentID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrParentNotFound.Error()})
	}
	if parent.Type != "text" {
		return c.JSON(400, echo.Map{"error": ErrParentInvalidType.Error()})
	}
	if !s.canCreateInParent(userID, parentID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}

	var req struct {
		Name            string `json:"name"`
		ParentMessageID string `json:"parent_message_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	req.Name = strings.TrimSpace(strings.ToLower(req.Name))
	if err := ValidateThreadName(req.Name, s.channelsCfg); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}

	t, err := s.createThread(parentID, parent.GuildID, req.Name, userID, req.ParentMessageID)
	if err != nil {
		logger.Error("threads: create failed", "error", err, "parent", parentID)
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}

	s.emitCreate(parentID, t)
	if s.audit != nil {
		s.audit.RecordGuild(userID, parent.GuildID, auditlog.TargetChannel, t.ID, auditlog.ActionThreadCreate, "",
			map[string]any{"parent_channel_id": parentID, "name": t.Name})
	}
	return c.JSON(201, t)
}

func (s *Service) List(c echo.Context) error {
	parentID := c.Param("channelId")
	userID := c.Get("userID").(string)

	if !s.canViewParent(userID, parentID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}

	includeArchived := c.QueryParam("archived") == "true"
	threads, err := s.listThreads(parentID, includeArchived)
	if err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	return c.JSON(200, threads)
}

func (s *Service) Get(c echo.Context) error {
	threadID := c.Param("threadId")
	userID := c.Get("userID").(string)

	t, err := s.getThread(threadID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrThreadNotFound.Error()})
	}
	if !s.canViewParent(userID, t.ParentChannelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	return c.JSON(200, t)
}

func (s *Service) Archive(c echo.Context) error {
	return s.setArchived(c, true, auditlog.ActionThreadArchive)
}

func (s *Service) Unarchive(c echo.Context) error {
	return s.setArchived(c, false, auditlog.ActionThreadUnarchive)
}

func (s *Service) setArchived(c echo.Context, archived bool, action string) error {
	threadID := c.Param("threadId")
	userID := c.Get("userID").(string)

	t, err := s.getThread(threadID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrThreadNotFound.Error()})
	}
	if t.OwnerID != userID && !s.canManageParent(userID, t.ParentChannelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}
	if err := s.db.SetThreadArchived(threadID, archived); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	t.Archived = archived

	s.emitUpdate(t.ParentChannelID, t)
	if s.audit != nil {
		s.audit.RecordGuild(userID, t.GuildID, auditlog.TargetChannel, threadID, action, "",
			map[string]any{"parent_channel_id": t.ParentChannelID})
	}
	return c.JSON(200, t)
}

func (s *Service) Delete(c echo.Context) error {
	threadID := c.Param("threadId")
	userID := c.Get("userID").(string)

	t, err := s.getThread(threadID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": ErrThreadNotFound.Error()})
	}
	if !s.canManageParent(userID, t.ParentChannelID) {
		return c.JSON(403, echo.Map{"error": ErrNotAllowed.Error()})
	}

	s.db.DeleteAttachmentsByChannel(threadID)
	s.db.DeleteMessagesByChannel(threadID)
	if _, err := s.db.Exec(`DELETE FROM channels WHERE id = $1 AND type = 'thread'`, threadID); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	db.InvalidateChannelMeta(threadID)

	s.emitDelete(t.ParentChannelID, threadID)
	if s.audit != nil {
		s.audit.RecordGuild(userID, t.GuildID, auditlog.TargetChannel, threadID, auditlog.ActionThreadDelete, "",
			map[string]any{"parent_channel_id": t.ParentChannelID, "name": t.Name})
	}
	return c.JSON(200, echo.Map{"deleted": true})
}