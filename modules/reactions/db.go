package reactions

import (
	"ror/modules/db"
)

type Reaction struct {
	EmojiID string   `json:"emoji_id"`
	Name    string   `json:"name"`
	Count   int      `json:"count"`
	Me      bool     `json:"me"`
	Users   []string `json:"users"`
}

func addReaction(db *db.DB, messageID, userID, emojiID string) error {
	return db.AddReaction(messageID, userID, emojiID)
}

func removeReaction(db *db.DB, messageID, userID, emojiID string) error {
	return db.RemoveReaction(messageID, userID, emojiID)
}

func countForMessage(db *db.DB, messageID, emojiID string) int {
	return db.CountReaction(messageID, emojiID)
}

func totalForMessage(db *db.DB, messageID string) int {
	return db.CountUniqueReactions(messageID)
}

func hasReacted(db *db.DB, messageID, userID, emojiID string) bool {
	return db.HasReacted(messageID, userID, emojiID)
}

func listForMessage(db *db.DB, messageID, viewerID string) []Reaction {
	rows, err := db.ListReactionsForMessage(viewerID, messageID)
	if err != nil || rows == nil {
		return nil
	}
	defer rows.Close()
	var out []Reaction
	for rows.Next() {
		var r Reaction
		var me int
		if rows.Scan(&r.EmojiID, &r.Name, &r.Count, &me) == nil {
			r.Me = me == 1
			out = append(out, r)
		}
	}
	return out
}

func listForMessages(db *db.DB, messageIDs []string, viewerID string) map[string][]Reaction {
	if len(messageIDs) == 0 {
		return nil
	}
	rows, err := db.ListReactionsForMessages(viewerID, messageIDs)
	if err != nil || rows == nil {
		return nil
	}
	defer rows.Close()
	result := make(map[string][]Reaction)
	for rows.Next() {
		var msgID, emojiID, name string
		var count, me int
		if rows.Scan(&msgID, &emojiID, &name, &count, &me) == nil {
			result[msgID] = append(result[msgID], Reaction{EmojiID: emojiID, Name: name, Count: count, Me: me == 1})
		}
	}
	return result
}

func getUsernamesForReaction(db *db.DB, messageID, emojiID string, limit int) []string {
	rows, err := db.GetReactionUsernames(messageID, emojiID, limit)
	if err != nil || rows == nil {
		return nil
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var name string
		if rows.Scan(&name) == nil {
			names = append(names, name)
		}
	}
	return names
}

func deleteByMessage(db *db.DB, messageID string) {
	db.DeleteReactionsByMessage(messageID)
}