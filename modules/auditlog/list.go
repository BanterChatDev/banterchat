package auditlog

import (
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

func (s *Service) listFiltered(c echo.Context, baseWhere string, baseArgs []any) error {
	limit := parseIntDef(c.QueryParam("limit"), 50, 1, 200)
	offset := parseIntDef(c.QueryParam("offset"), 0, 0, 1<<30)
	action := c.QueryParam("action")
	actor := c.QueryParam("actor_id")
	target := c.QueryParam("target_id")

	listQuery := `SELECT id, guild_id, actor_id, target_type, target_id, action, reason, metadata, is_site, created_at FROM audit_log WHERE ` + baseWhere
	listArgs := append([]any{}, baseArgs...)
	argN := len(listArgs) + 1

	if action != "" {
		listQuery += " AND action = $" + strconv.Itoa(argN)
		listArgs = append(listArgs, action)
		argN++
	}
	if actor != "" {
		listQuery += " AND actor_id = $" + strconv.Itoa(argN)
		listArgs = append(listArgs, actor)
		argN++
	}
	if target != "" {
		listQuery += " AND target_id = $" + strconv.Itoa(argN)
		listArgs = append(listArgs, target)
		argN++
	}
	listQuery += " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(argN) + " OFFSET $" + strconv.Itoa(argN+1)
	listArgs = append(listArgs, limit, offset)

	rows, err := s.db.Query(listQuery, listArgs...)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	defer rows.Close()
	out := s.scanEntries(rows, limit)
	s.hydrateEntries(out)

	countQuery := `SELECT COUNT(*) FROM audit_log WHERE ` + baseWhere
	countArgs := append([]any{}, baseArgs...)
	argN = len(countArgs) + 1
	if action != "" {
		countQuery += " AND action = $" + strconv.Itoa(argN)
		countArgs = append(countArgs, action)
		argN++
	}
	if actor != "" {
		countQuery += " AND actor_id = $" + strconv.Itoa(argN)
		countArgs = append(countArgs, actor)
		argN++
	}
	if target != "" {
		countQuery += " AND target_id = $" + strconv.Itoa(argN)
		countArgs = append(countArgs, target)
	}
	var total int
	s.db.QueryRow(countQuery, countArgs...).Scan(&total)

	return c.JSON(200, echo.Map{"entries": out, "total": total, "limit": limit, "offset": offset})
}

func (s *Service) ListSite(c echo.Context) error {
	return s.listFiltered(c, "is_site = true", nil)
}

func (s *Service) ListGuild(c echo.Context) error {
	guildID := c.Param("guildId")
	return s.listFiltered(c, "guild_id = $1", []any{guildID})
}

func (s *Service) ListMine(c echo.Context) error {
	userID := c.Get("userID").(string)
	return s.listFiltered(c, "target_type = $1 AND target_id = $2 AND is_site = false", []any{TargetUser, userID})
}

func (s *Service) ExportSite(c echo.Context) error {
	rows, err := s.db.Query(`SELECT id, guild_id, actor_id, target_type, target_id, action, reason, metadata, is_site, created_at
		FROM audit_log WHERE is_site = true ORDER BY created_at DESC LIMIT 10000`)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	defer rows.Close()
	out := s.scanEntries(rows, 1000)
	s.hydrateEntries(out)
	c.Response().Header().Set("Content-Type", "application/json")
	c.Response().Header().Set("Content-Disposition", "attachment; filename=audit-log.json")
	return c.JSON(200, echo.Map{"entries": out, "exported_at": time.Now()})
}