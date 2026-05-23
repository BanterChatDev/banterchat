package keyfile

import (
	"encoding/hex"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"ror/modules/apperr"
	"ror/modules/auditlog"
	"ror/modules/db"
	"ror/modules/encryption"
	"ror/modules/logger"
	"ror/modules/usernames"
)

type HandlerDeps struct {
	DB                *db.DB
	KeyfileSvc        *Service
	Audit             *auditlog.Service
	MasterKey         string
	HashIP            func(ip string) string
	UpdateLastLoginIP func(userID, ipHash string)
	SetSession        func(c echo.Context, userID string)
	EmitSessionChange func(userID string)
	NukeOtherSessions func(c echo.Context, userID string)
	NukeAllSessions   func(userID string)
	ValidatePassword  func(password string) error
	GetUserByID       func(userID string) (*UserRef, error)
	GetUserByUsername func(usernameHash string) (*UserRef, error)
	DecryptUsername   func(u *UserRef) string
}

type UserRef struct {
	ID           string
	PasswordHash string
	LastLoginIP  string
	EncUsername  string
}

type Handlers struct {
	d HandlerDeps
}

func NewHandlers(d HandlerDeps) *Handlers {
	return &Handlers{d: d}
}

func Decode(s string) ([]byte, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, false
	}
	b, err := hex.DecodeString(s)
	if err != nil {
		return nil, false
	}
	return b, true
}

func (h *Handlers) Generate(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": apperr.ErrInvalidRequest.Error()})
	}
	if req.Password == "" {
		return c.JSON(400, echo.Map{"error": ErrPasswordRequired.Error()})
	}
	user, err := h.d.GetUserByID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return c.JSON(403, echo.Map{"error": ErrPasswordWrong.Error()})
	}
	if h.d.DB.GetUserKeyfileHash(userID) != "" {
		return c.JSON(409, echo.Map{"error": ErrAlreadySet.Error()})
	}
	bytes := h.d.KeyfileSvc.Generate()
	hash := Hash(bytes)
	if err := h.d.DB.SetUserKeyfileHash(userID, hash); err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	h.d.NukeOtherSessions(c, userID)
	h.d.KeyfileSvc.emitKeyfileChange(userID, hash)
	h.d.Audit.Record(userID, auditlog.TargetUser, userID, auditlog.ActionUserKeyfileSet, "", map[string]any{
		"fingerprint": hash,
		"ip_hash":     h.d.HashIP(c.RealIP()),
		"user_agent":  c.Request().UserAgent(),
	}, "", false)
	return c.JSON(200, echo.Map{
		"keyfile":     hex.EncodeToString(bytes),
		"fingerprint": hash,
	})
}

func (h *Handlers) Rotate(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": apperr.ErrInvalidRequest.Error()})
	}
	if req.Password == "" {
		return c.JSON(400, echo.Map{"error": ErrPasswordRequired.Error()})
	}
	user, err := h.d.GetUserByID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return c.JSON(403, echo.Map{"error": ErrPasswordWrong.Error()})
	}
	oldHash := h.d.DB.GetUserKeyfileHash(userID)
	if oldHash == "" {
		return c.JSON(404, echo.Map{"error": ErrNoKeyfileSet.Error()})
	}
	bytes := h.d.KeyfileSvc.Generate()
	newHash := Hash(bytes)
	if err := h.d.DB.SetUserKeyfileHash(userID, newHash); err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	h.d.NukeOtherSessions(c, userID)
	h.d.KeyfileSvc.emitKeyfileChange(userID, newHash)
	h.d.Audit.Record(userID, auditlog.TargetUser, userID, auditlog.ActionUserKeyfileRotate, "", map[string]any{
		"old_fingerprint": oldHash,
		"new_fingerprint": newHash,
		"ip_hash":         h.d.HashIP(c.RealIP()),
		"user_agent":      c.Request().UserAgent(),
	}, "", false)
	return c.JSON(200, echo.Map{
		"keyfile":     hex.EncodeToString(bytes),
		"fingerprint": newHash,
	})
}

func (h *Handlers) Remove(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Password string `json:"password"`
		Keyfile  string `json:"keyfile"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": apperr.ErrInvalidRequest.Error()})
	}
	if req.Password == "" {
		return c.JSON(400, echo.Map{"error": ErrPasswordRequired.Error()})
	}
	user, err := h.d.GetUserByID(userID)
	if err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return c.JSON(403, echo.Map{"error": ErrPasswordWrong.Error()})
	}
	oldHash := h.d.DB.GetUserKeyfileHash(userID)
	if oldHash == "" {
		return c.JSON(404, echo.Map{"error": ErrNoKeyfileSet.Error()})
	}
	keyfileBytes, ok := Decode(req.Keyfile)
	if !ok || !Verify(keyfileBytes, oldHash) {
		return c.JSON(403, echo.Map{"error": ErrWrongKeyfile.Error()})
	}
	if err := h.d.DB.SetUserKeyfileHash(userID, ""); err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	h.d.NukeOtherSessions(c, userID)
	h.d.KeyfileSvc.emitKeyfileChange(userID, "")
	h.d.Audit.Record(userID, auditlog.TargetUser, userID, auditlog.ActionUserKeyfileRemove, "", map[string]any{
		"old_fingerprint": oldHash,
		"ip_hash":         h.d.HashIP(c.RealIP()),
		"user_agent":      c.Request().UserAgent(),
	}, "", false)
	return c.JSON(200, echo.Map{"message": "keyfile removed"})
}

func (h *Handlers) VerifyNewDevice(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Keyfile  string `json:"keyfile"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": apperr.ErrInvalidRequest.Error()})
	}
	req.Username = usernames.Sanitize(req.Username)
	bytes, ok := Decode(req.Keyfile)
	if !ok {
		return c.JSON(400, echo.Map{"error": ErrInvalid.Error()})
	}
	usernameHash := encryption.HashIdentifier(req.Username, h.d.MasterKey)
	user, err := h.d.GetUserByUsername(usernameHash)
	if err != nil {
		return c.JSON(401, echo.Map{"error": ErrWrongKeyfile.Error()})
	}
	stored := h.d.DB.GetUserKeyfileHash(user.ID)
	if !Verify(bytes, stored) {
		return c.JSON(401, echo.Map{"error": ErrWrongKeyfile.Error()})
	}
	currentIPHash := h.d.HashIP(c.RealIP())
	h.d.UpdateLastLoginIP(user.ID, currentIPHash)
	h.d.SetSession(c, user.ID)
	h.d.EmitSessionChange(user.ID)
	h.d.Audit.Record(user.ID, auditlog.TargetUser, user.ID, auditlog.ActionUserNewDeviceLogin, "", map[string]any{
		"fingerprint": stored,
		"ip_hash":     currentIPHash,
		"user_agent":  c.Request().UserAgent(),
	}, "", false)
	return c.JSON(200, echo.Map{
		"id":       user.ID,
		"username": h.d.DecryptUsername(user),
	})
}

func (h *Handlers) ForgotPassword(c echo.Context) error {
	var req struct {
		Username    string `json:"username"`
		Keyfile     string `json:"keyfile"`
		NewPassword string `json:"new_password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": apperr.ErrInvalidRequest.Error()})
	}
	req.Username = usernames.Sanitize(req.Username)
	bytes, ok := Decode(req.Keyfile)
	if !ok {
		return c.JSON(400, echo.Map{"error": ErrInvalid.Error()})
	}
	if err := h.d.ValidatePassword(req.NewPassword); err != nil {
		return c.JSON(400, echo.Map{"error": err.Error()})
	}
	usernameHash := encryption.HashIdentifier(req.Username, h.d.MasterKey)
	user, err := h.d.GetUserByUsername(usernameHash)
	if err != nil {
		return c.JSON(200, echo.Map{"message": "If that account exists with a keyfile, the password has been reset"})
	}
	stored := h.d.DB.GetUserKeyfileHash(user.ID)
	if !Verify(bytes, stored) {
		return c.JSON(200, echo.Map{"message": "If that account exists with a keyfile, the password has been reset"})
	}
	pwHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	if err := h.d.DB.UpdateUserPassword(user.ID, string(pwHash)); err != nil {
		return c.JSON(500, echo.Map{"error": apperr.ErrServerError.Error()})
	}
	h.d.NukeAllSessions(user.ID)
	h.d.Audit.Record(user.ID, auditlog.TargetUser, user.ID, auditlog.ActionUserPasswordReset, "", map[string]any{
		"fingerprint": stored,
		"ip_hash":     h.d.HashIP(c.RealIP()),
		"user_agent":  c.Request().UserAgent(),
		"at":          time.Now().UTC().Format(time.RFC3339),
	}, "", false)
	logger.Info("keyfile: password reset via keyfile", "user_id", user.ID)
	return c.JSON(200, echo.Map{"message": "password reset"})
}