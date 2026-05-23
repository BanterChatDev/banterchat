package auditlog

import (
	"database/sql"
	"encoding/json"

	"ror/modules/id"
)

func (s *Service) Record(actorID, targetType, targetID, action, reason string, metadata map[string]any, guildID string, isSite bool) string {
	entryID := id.Generate()
	metaJSON := "{}"
	if len(metadata) > 0 {
		if b, err := json.Marshal(metadata); err == nil {
			metaJSON = string(b)
		}
	}
	_, err := s.db.Exec(`INSERT INTO audit_log (id, guild_id, actor_id, target_type, target_id, action, reason, metadata, is_site)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		entryID, guildID, actorID, targetType, targetID, action, reason, metaJSON, isSite)
	if err != nil {
		return ""
	}
	return entryID
}

func (s *Service) RecordSite(actorID, targetType, targetID, action, reason string, metadata map[string]any) string {
	return s.Record(actorID, targetType, targetID, action, reason, metadata, "", true)
}

func (s *Service) RecordGuild(actorID, guildID, targetType, targetID, action, reason string, metadata map[string]any) string {
	return s.Record(actorID, targetType, targetID, action, reason, metadata, guildID, false)
}

func (s *Service) scanEntries(rows *sql.Rows, capacity int) []Entry {
	out := make([]Entry, 0, capacity)
	for rows.Next() {
		var e Entry
		var metaStr string
		rows.Scan(&e.ID, &e.GuildID, &e.ActorID, &e.TargetType, &e.TargetID, &e.Action, &e.Reason, &metaStr, &e.IsSite, &e.CreatedAt)
		_ = json.Unmarshal([]byte(metaStr), &e.Metadata)
		if e.Metadata == nil {
			e.Metadata = map[string]any{}
		}
		out = append(out, e)
	}
	return out
}

func (s *Service) hydrateEntries(entries []Entry) {
	if s.HydrateUser == nil {
		return
	}
	cache := map[string]map[string]any{}
	resolve := func(userID string) map[string]any {
		if userID == "" {
			return nil
		}
		if v, ok := cache[userID]; ok {
			return v
		}
		v := s.HydrateUser(userID)
		cache[userID] = v
		return v
	}
	for i := range entries {
		entries[i].Actor = resolve(entries[i].ActorID)
		if entries[i].TargetType == TargetUser {
			entries[i].TargetUser = resolve(entries[i].TargetID)
		}
	}
}