package accessibilityprefs

import "encoding/json"

func (s *Service) Get(userID string) map[string]interface{} {
	var raw string
	s.db.QueryRow(`SELECT accessibility_prefs FROM users WHERE id = $1`, userID).Scan(&raw)
	m := map[string]interface{}{}
	if raw != "" && raw != "{}" {
		json.Unmarshal([]byte(raw), &m)
	}
	return m
}

func (s *Service) Set(userID string, prefs map[string]interface{}) error {
	data, err := json.Marshal(prefs)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`UPDATE users SET accessibility_prefs = $1 WHERE id = $2`, string(data), userID)
	return err
}