package uiprefs

import (
	"github.com/labstack/echo/v4"
)

var validLangIDs = map[string]bool{
	"en_us": true,
	"es_es": true,
	"it_it": true,
	"fr_fr": true,
}

func (s *Service) GetPrefs(c echo.Context) error {
	userID := c.Get("userID").(string)
	resp := map[string]interface{}{
		"theme_id": s.GetThemeID(userID),
		"lang_id":  s.GetLangID(userID),
	}
	for k, v := range s.GetUIPrefs(userID) {
		resp[k] = v
	}
	return c.JSON(200, resp)
}

func (s *Service) UpdatePrefs(c echo.Context) error {
	userID := c.Get("userID").(string)
	var incoming map[string]interface{}
	if err := c.Bind(&incoming); err != nil {
		return c.JSON(400, echo.Map{"error": ErrInvalidRequest.Error()})
	}
	broadcast := map[string]interface{}{}
	if tid, ok := incoming["theme_id"].(string); ok && tid != "" {
		s.SetThemeID(userID, tid)
		broadcast["theme_id"] = tid
		s.emitUserUpdate(userID, echo.Map{
			"id":       userID,
			"theme_id": tid,
		})
		delete(incoming, "theme_id")
	}
	if lid, ok := incoming["lang_id"].(string); ok && validLangIDs[lid] {
		if err := s.SetLangID(userID, lid); err == nil {
			broadcast["lang_id"] = lid
			s.emitUserUpdate(userID, echo.Map{
				"id":      userID,
				"lang_id": lid,
			})
		}
		delete(incoming, "lang_id")
	}
	existing := s.GetUIPrefs(userID)
	for k, v := range incoming {
		if k == "notification_sound_id" {
			str, ok := v.(string)
			if !ok || (str != "" && len(str) != 32) {
				continue
			}
			if prev, _ := existing["notification_sound_id"].(string); prev != "" && prev != str && s.DeleteAttachment != nil {
				s.DeleteAttachment(prev)
			}
		}
		existing[k] = v
		broadcast[k] = v
	}
	if err := s.SetUIPrefs(userID, existing); err != nil {
		return c.JSON(500, echo.Map{"error": ErrServerError.Error()})
	}
	s.emitPrefsUpdate(userID, broadcast)
	resp := map[string]interface{}{
		"theme_id": s.GetThemeID(userID),
		"lang_id":  s.GetLangID(userID),
	}
	for k, v := range existing {
		resp[k] = v
	}
	return c.JSON(200, resp)
}