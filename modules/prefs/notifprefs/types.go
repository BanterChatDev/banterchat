package notifprefs

type Pref struct {
	ScopeType        string `json:"scope_type"`
	ScopeID          string `json:"scope_id"`
	Level            string `json:"level"`
	SuppressEveryone bool   `json:"suppress_everyone"`
	SuppressRoles    bool   `json:"suppress_roles"`
}

const (
	ScopeGlobal  = "global"
	ScopeGuild   = "guild"
	ScopeChannel = "channel"

	LevelAll      = "all"
	LevelMentions = "mentions"
	LevelNothing  = "nothing"
)

func defaultPref(scopeType, scopeID string) Pref {
	return Pref{
		ScopeType: scopeType,
		ScopeID:   scopeID,
		Level:     LevelMentions,
	}
}

func validLevel(l string) bool {
	return l == LevelAll || l == LevelMentions || l == LevelNothing
}