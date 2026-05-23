package reports

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/logger"
	"ror/modules/users"
	"ror/modules/websocket"
)

var (
	ErrInvalidTarget = errors.New("invalid target")
	ErrNotFound      = errors.New("report not found")
)

var validTargets = map[string]bool{
	"user":    true,
	"message": true,
	"guild":   true,
}

type Service struct {
	db    *db.DB
	hub   *websocket.Hub
	users *users.Service
	audit *auditlog.Service

	DeleteMessageByID func(messageID, actorID string, force bool) error

	SnapshotMessage func(messageID string) (content, authorID, authorUsername, authorAvatar, channelID, createdAt string, ok bool)
	SnapshotGuild   func(guildID string) (name, iconID, ownerID, ownerUsername string, memberCount int, ok bool)
	SnapshotUser    func(userID string) (username, avatarID, bio string, ok bool)
}

func NewService(dbConn *db.DB, hub *websocket.Hub, usersSvc *users.Service, auditSvc *auditlog.Service) *Service {
	return &Service{db: dbConn, hub: hub, users: usersSvc, audit: auditSvc}
}

func (s *Service) CreateReport(c echo.Context) error {
	reporterID := c.Get("userID").(string)
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   string `json:"target_id"`
		Reason     string `json:"reason"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	req.TargetType = strings.ToLower(strings.TrimSpace(req.TargetType))
	req.TargetID = strings.TrimSpace(req.TargetID)
	req.Reason = strings.TrimSpace(req.Reason)
	if !validTargets[req.TargetType] || req.TargetID == "" {
		return c.JSON(400, echo.Map{"error": ErrInvalidTarget.Error()})
	}
	if len(req.Reason) > 500 {
		req.Reason = req.Reason[:500]
	}
	rid := id.Generate()
	if err := s.db.InsertReport(rid, reporterID, req.TargetType, req.TargetID, req.Reason); err != nil {
		logger.Error("reports: insert failed", "error", err, "reporter_id", reporterID, "target_type", req.TargetType, "target_id", req.TargetID)
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	payload := s.buildNewReportPayload(rid, reporterID, req.TargetType, req.TargetID, req.Reason)
	s.emitNew(payload)
	return c.JSON(200, echo.Map{"id": rid, "message": "report submitted"})
}

func (s *Service) ListOpenReports(c echo.Context) error {
	status := c.QueryParam("status")
	if status == "" {
		status = "open"
	}
	limit := parseReportLimit(c.QueryParam("limit"))
	offset := parseReportOffset(c.QueryParam("offset"))

	rows, err := s.db.ListReportsByStatus(status)
	if err != nil {
		logger.Error("reports: list failed", "error", err, "status", status)
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	total := len(rows)
	if offset > total {
		offset = total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	page := rows[offset:end]
	items := make([]echo.Map, 0, len(page))
	for _, r := range page {
		items = append(items, s.buildReportPayloadFromRow(r))
	}
	return c.JSON(200, echo.Map{
		"reports":    items,
		"total":      total,
		"offset":     offset,
		"limit":      limit,
		"open_count": s.db.CountOpenReports(),
	})
}

func parseReportLimit(s string) int {
	if s == "" {
		return 50
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return 50
	}
	if n > 200 {
		return 200
	}
	return n
}

func parseReportOffset(s string) int {
	if s == "" {
		return 0
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

func (s *Service) Resolve(c echo.Context) error {
	actorID := c.Get("userID").(string)
	reportID := c.Param("id")
	var req struct {
		Action string `json:"action"`
	}
	c.Bind(&req)
	action := strings.ToLower(strings.TrimSpace(req.Action))
	if action == "" {
		action = "dismiss"
	}
	row, err := s.db.GetReport(reportID)
	if err != nil {
		logger.Error("reports: get failed", "error", err, "report_id", reportID)
		return c.JSON(404, echo.Map{"error": ErrNotFound.Error()})
	}
	if row.Status != "open" {
		return c.JSON(200, echo.Map{"id": reportID, "status": row.Status})
	}
	if action == "delete_message" && row.TargetType == "message" {
		if s.DeleteMessageByID == nil {
			return c.JSON(500, echo.Map{"error": "delete path not wired"})
		}
		if err := s.DeleteMessageByID(row.TargetID, actorID, true); err != nil {
			logger.Error("reports: delete message failed", "error", err, "report_id", reportID, "actor_id", actorID, "message_id", row.TargetID)
			return c.JSON(500, echo.Map{"error": "could not delete message: " + err.Error()})
		}
	}
	if err := s.db.ResolveReport(reportID, actorID, action); err != nil {
		logger.Error("reports: resolve failed", "error", err, "report_id", reportID, "actor_id", actorID, "action", action)
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetReport, reportID, auditlog.ActionReportResolve, row.Reason, map[string]any{
			"action":      action,
			"target_type": row.TargetType,
			"target_id":   row.TargetID,
			"reporter_id": row.ReporterID,
		})
	}
	s.emitResolved(reportID, actorID, action)
	return c.JSON(200, echo.Map{"id": reportID, "status": "resolved", "resolution_action": action})
}

func (s *Service) buildReportPayloadFromRow(r db.ReportRow) echo.Map {
	payload := echo.Map{
		"id":                r.ID,
		"reporter_id":       r.ReporterID,
		"reporter_username": s.users.DecryptUsernameByID(r.ReporterID),
		"target_type":       r.TargetType,
		"target_id":         r.TargetID,
		"reason":            r.Reason,
		"status":            r.Status,
		"created_at":        r.CreatedAt,
		"resolution_action": r.ResolutionAction,
	}
	if s.users.GetAvatarID != nil {
		payload["reporter_avatar_id"] = s.users.GetAvatarID(r.ReporterID)
	}
	if r.ResolvedAt != nil {
		payload["resolved_at"] = *r.ResolvedAt
	}
	if r.ResolvedBy != nil {
		payload["resolved_by"] = *r.ResolvedBy
		payload["resolved_by_username"] = s.users.DecryptUsernameByID(*r.ResolvedBy)
	}
	payload["snapshot"] = s.buildSnapshot(r.TargetType, r.TargetID)
	if r.TargetType == "user" {
		payload["target_username"] = s.users.DecryptUsernameByID(r.TargetID)
	}
	return payload
}

func (s *Service) buildNewReportPayload(rid, reporterID, targetType, targetID, reason string) echo.Map {
	return s.buildReportPayloadFromRow(db.ReportRow{
		ID:         rid,
		ReporterID: reporterID,
		TargetType: targetType,
		TargetID:   targetID,
		Reason:     reason,
		Status:     "open",
		CreatedAt:  time.Now().UTC(),
	})
}

func (s *Service) buildSnapshot(targetType, targetID string) echo.Map {
	switch targetType {
	case "message":
		if s.SnapshotMessage == nil {
			return nil
		}
		content, authorID, author, avatar, channelID, createdAt, ok := s.SnapshotMessage(targetID)
		if !ok {
			return echo.Map{"deleted": true}
		}
		return echo.Map{
			"content":    content,
			"author_id":  authorID,
			"username":   author,
			"avatar_id":  avatar,
			"channel_id": channelID,
			"created_at": createdAt,
		}
	case "user":
		if s.SnapshotUser == nil {
			return nil
		}
		username, avatarID, bio, ok := s.SnapshotUser(targetID)
		if !ok {
			return echo.Map{"deleted": true}
		}
		return echo.Map{
			"username":  username,
			"avatar_id": avatarID,
			"bio":       bio,
		}
	case "guild":
		if s.SnapshotGuild == nil {
			return nil
		}
		name, iconID, ownerID, ownerUsername, memberCount, ok := s.SnapshotGuild(targetID)
		if !ok {
			return echo.Map{"deleted": true}
		}
		return echo.Map{
			"name":           name,
			"icon":           iconID,
			"owner_id":       ownerID,
			"owner_username": ownerUsername,
			"member_count":   memberCount,
		}
	}
	return nil
}