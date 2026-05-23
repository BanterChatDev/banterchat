package warnings

import (
	"os"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/users"
	"ror/modules/websocket"
)

type Service struct {
	db    *db.DB
	users *users.Service
	hub   *websocket.Hub
	audit *auditlog.Service
}

func NewService(d *db.DB, u *users.Service, hub *websocket.Hub, audit *auditlog.Service) *Service {
	return &Service{db: d, users: u, hub: hub, audit: audit}
}

type Warning struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	IssuedBy     string    `json:"issued_by"`
	Reasons      []string  `json:"reasons"`
	Note         string    `json:"note"`
	Severity     int       `json:"severity"`
	Acknowledged bool      `json:"acknowledged"`
	CreatedAt    time.Time `json:"created_at"`
}

var presetReasons = []string{
	"Harassment of other users",
	"Spamming",
	"Posting illegal content",
	"Evading a previous ban",
	"Distributing malware or phishing links",
	"Impersonating another user or staff",
	"Doxxing or sharing personal information without consent",
	"Repeatedly violating the Terms of Service",
	"Disruptive behavior in public servers",
	"Misuse of the report system",
}

var warningSystemTemplate = buildWarningTemplate()

func buildWarningTemplate() string {
	termsURL := os.Getenv("TERMS_URL")
	if termsURL == "" {
		termsURL = "https://example.com/terms"
	}
	return `You have been warned by the server admins, the reason includes the following:

%s

Please follow the terms of service. ` + termsURL
}

func (s *Service) PresetReasons(c echo.Context) error {
	return c.JSON(200, echo.Map{"reasons": presetReasons})
}

func (s *Service) Issue(c echo.Context) error {
	actorID := c.Get("userID").(string)
	targetID := c.Param("userId")
	if targetID == "" {
		return c.JSON(400, echo.Map{"error": "missing user id"})
	}
	if targetID == actorID {
		return c.JSON(400, echo.Map{"error": "cannot warn yourself"})
	}

	var body struct {
		Reasons  []string `json:"reasons"`
		Note     string   `json:"note"`
		Severity int      `json:"severity"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid body"})
	}
	cleanReasons := []string{}
	for _, r := range body.Reasons {
		r = strings.TrimSpace(r)
		if r != "" && len(r) <= 200 {
			cleanReasons = append(cleanReasons, r)
		}
	}
	if len(cleanReasons) == 0 && strings.TrimSpace(body.Note) == "" {
		return c.JSON(400, echo.Map{"error": "at least one reason or a note is required"})
	}
	sev := body.Severity
	if sev < 1 {
		sev = 1
	}
	if sev > 5 {
		sev = 5
	}

	target, err := s.users.GetUserByID(targetID)
	if err != nil || target == nil {
		return c.JSON(404, echo.Map{"error": "user not found"})
	}

	wid := id.Generate()
	reasonsJSON, _ := json.Marshal(cleanReasons)
	_, err = s.db.Exec(`INSERT INTO admin_warnings (id, user_id, issued_by, reasons, note, severity)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		wid, targetID, actorID, string(reasonsJSON), body.Note, sev)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "could not save warning"})
	}
	s.db.Exec(`INSERT INTO user_warnings_unread (user_id, warning_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, targetID, wid)
	s.db.Exec(`UPDATE users SET warning_count = warning_count + 1 WHERE id = $1`, targetID)

	formatted := s.formatWarning(cleanReasons, body.Note)

	s.emitIssued(targetID, wid, cleanReasons, body.Note, sev, formatted)

	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetUser, targetID, auditlog.ActionUserWarn,
			strings.Join(cleanReasons, "; "),
			map[string]any{"warning_id": wid, "severity": sev, "note": body.Note})
	}

	return c.JSON(201, echo.Map{"id": wid, "delivered": true})
}

func (s *Service) formatWarning(reasons []string, note string) string {
	var b strings.Builder
	if len(reasons) > 0 {
		for _, r := range reasons {
			b.WriteString("• ")
			b.WriteString(r)
			b.WriteString("\n")
		}
	}
	if strings.TrimSpace(note) != "" {
		if b.Len() > 0 {
			b.WriteString("\nAdditional notes:\n")
		}
		b.WriteString(note)
	}
	body := strings.TrimSpace(b.String())
	return strings.Replace(warningSystemTemplate, "%s", body, 1)
}

func (s *Service) ListForUser(c echo.Context) error {
	userID := c.Param("userId")
	limit := parseIntDef(c.QueryParam("limit"), 50, 1, 200)
	rows, err := s.db.Query(`SELECT id, user_id, issued_by, reasons, note, severity, acknowledged, created_at
		FROM admin_warnings WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	defer rows.Close()
	out := []Warning{}
	for rows.Next() {
		var w Warning
		var reasonsStr string
		rows.Scan(&w.ID, &w.UserID, &w.IssuedBy, &reasonsStr, &w.Note, &w.Severity, &w.Acknowledged, &w.CreatedAt)
		_ = json.Unmarshal([]byte(reasonsStr), &w.Reasons)
		if w.Reasons == nil {
			w.Reasons = []string{}
		}
		out = append(out, w)
	}
	return c.JSON(200, echo.Map{"warnings": out})
}

func (s *Service) ListMine(c echo.Context) error {
	userID := c.Get("userID").(string)
	rows, err := s.db.Query(`SELECT id, user_id, issued_by, reasons, note, severity, acknowledged, created_at
		FROM admin_warnings WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	defer rows.Close()
	out := []Warning{}
	for rows.Next() {
		var w Warning
		var reasonsStr string
		rows.Scan(&w.ID, &w.UserID, &w.IssuedBy, &reasonsStr, &w.Note, &w.Severity, &w.Acknowledged, &w.CreatedAt)
		_ = json.Unmarshal([]byte(reasonsStr), &w.Reasons)
		if w.Reasons == nil {
			w.Reasons = []string{}
		}
		out = append(out, w)
	}
	return c.JSON(200, echo.Map{"warnings": out})
}

func (s *Service) Acknowledge(c echo.Context) error {
	userID := c.Get("userID").(string)
	wid := c.Param("id")
	res, err := s.db.Exec(`UPDATE admin_warnings SET acknowledged = true WHERE id = $1 AND user_id = $2`, wid, userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return c.JSON(404, echo.Map{"error": "warning not found"})
	}
	s.db.Exec(`DELETE FROM user_warnings_unread WHERE warning_id = $1`, wid)
	return c.JSON(200, echo.Map{"acknowledged": true})
}

func (s *Service) Revoke(c echo.Context) error {
	actorID := c.Get("userID").(string)
	wid := c.Param("id")
	var userID string
	err := s.db.QueryRow(`SELECT user_id FROM admin_warnings WHERE id = $1`, wid).Scan(&userID)
	if err != nil {
		return c.JSON(404, echo.Map{"error": "warning not found"})
	}
	_, err = s.db.Exec(`DELETE FROM admin_warnings WHERE id = $1`, wid)
	if err != nil {
		return c.JSON(500, echo.Map{"error": "db error"})
	}
	s.db.Exec(`UPDATE users SET warning_count = GREATEST(0, warning_count - 1) WHERE id = $1`, userID)
	if s.audit != nil {
		s.audit.RecordSite(actorID, auditlog.TargetWarning, wid, "warning.revoke", "",
			map[string]any{"target_user": userID})
	}
	return c.JSON(200, echo.Map{"revoked": true})
}

func parseIntDef(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}
