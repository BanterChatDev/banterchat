package notifprefs

import (
	"github.com/lib/pq"
)

func (s *Service) loadOne(userID, scopeType, scopeID string) (Pref, bool, error) {
	var p Pref
	err := s.db.QueryRow(`SELECT scope_type, scope_id, level, suppress_everyone, suppress_roles FROM notification_prefs WHERE user_id = $1 AND scope_type = $2 AND scope_id = $3`,
		userID, scopeType, scopeID,
	).Scan(&p.ScopeType, &p.ScopeID, &p.Level, &p.SuppressEveryone, &p.SuppressRoles)
	if err != nil {
		return Pref{}, false, err
	}
	return p, true, nil
}

func (s *Service) loadPrefsBatch(userIDs []string, scopeType, scopeID string) map[string]Pref {
	out := make(map[string]Pref, len(userIDs))
	if len(userIDs) == 0 {
		return out
	}
	rows, err := s.db.Query(`SELECT user_id, scope_type, scope_id, level, suppress_everyone, suppress_roles FROM notification_prefs WHERE user_id = ANY($1::text[]) AND scope_type = $2 AND scope_id = $3`,
		pq.Array(userIDs), scopeType, scopeID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var uid string
		var p Pref
		if rows.Scan(&uid, &p.ScopeType, &p.ScopeID, &p.Level, &p.SuppressEveryone, &p.SuppressRoles) == nil {
			out[uid] = p
		}
	}
	return out
}

func (s *Service) upsert(userID string, p Pref) error {
	_, err := s.db.Exec(`INSERT INTO notification_prefs (user_id, scope_type, scope_id, level, suppress_everyone, suppress_roles) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, scope_type, scope_id) DO UPDATE SET level = EXCLUDED.level, suppress_everyone = EXCLUDED.suppress_everyone, suppress_roles = EXCLUDED.suppress_roles`,
		userID, p.ScopeType, p.ScopeID, p.Level, p.SuppressEveryone, p.SuppressRoles)
	return err
}

func (s *Service) deleteScope(userID, scopeType, scopeID string) error {
	_, err := s.db.Exec(`DELETE FROM notification_prefs WHERE user_id = $1 AND scope_type = $2 AND scope_id = $3`, userID, scopeType, scopeID)
	return err
}

func (s *Service) listMine(userID string) ([]Pref, error) {
	rows, err := s.db.Query(`SELECT scope_type, scope_id, level, suppress_everyone, suppress_roles FROM notification_prefs WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Pref{}
	for rows.Next() {
		var p Pref
		if rows.Scan(&p.ScopeType, &p.ScopeID, &p.Level, &p.SuppressEveryone, &p.SuppressRoles) == nil {
			out = append(out, p)
		}
	}
	return out, nil
}