package uiprefs

import (
	"encoding/json"

	"ror/modules/encryption"
)

func (s *Service) GetUIPrefs(userID string) map[string]interface{} {
	var raw string
	s.db.QueryRow(`SELECT ui_prefs FROM users WHERE id = $1`, userID).Scan(&raw)
	m := map[string]interface{}{}
	if raw != "" && raw != "{}" {
		json.Unmarshal([]byte(raw), &m)
	}
	return m
}

func (s *Service) SetUIPrefs(userID string, prefs map[string]interface{}) error {
	delete(prefs, "theme")
	data, err := json.Marshal(prefs)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE users SET ui_prefs = $1 WHERE id = $2`, string(data), userID)
	return err
}

func (s *Service) GetThemeID(userID string) string {
	var tid string
	s.db.QueryRow(`SELECT theme_id FROM users WHERE id = $1`, userID).Scan(&tid)
	if tid == "" {
		return "dark"
	}
	return tid
}

func (s *Service) SetThemeID(userID, themeID string) error {
	_, err := s.db.Exec(`UPDATE users SET theme_id = $1 WHERE id = $2`, themeID, userID)
	return err
}

func (s *Service) getEncryptedLangID(userID string) string {
	var enc string
	s.db.QueryRow(`SELECT encrypted_lang_id FROM users WHERE id = $1`, userID).Scan(&enc)
	return enc
}

func (s *Service) GetLangID(userID string) string {
	enc := s.getEncryptedLangID(userID)
	if enc == "" {
		return "en_us"
	}
	plain, err := encryption.DecryptWithMaster(enc, s.masterKey)
	if err != nil || plain == "" {
		return "en_us"
	}
	return plain
}

func (s *Service) SetLangID(userID, langID string) error {
	enc, err := encryption.EncryptWithMaster(langID, s.masterKey)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE users SET encrypted_lang_id = $1 WHERE id = $2`, enc, userID)
	return err
}