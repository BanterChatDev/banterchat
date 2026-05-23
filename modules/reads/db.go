package reads

import (
	"github.com/lib/pq"
	"ror/modules/logger"
)

type ReadRow struct {
	ChannelID string
	GuildID   string
	Unread    int
	Mentions  int
}

func (s *Service) upsertUnread(userID, channelID string) error {
	_, err := s.db.Exec(`INSERT INTO notifications (user_id, channel_id, unread) VALUES ($1, $2, 1) ON CONFLICT (user_id, channel_id) DO UPDATE SET unread = notifications.unread + 1`, userID, channelID)
	if err != nil {
		logger.Error("reads: upsertUnread failed", "user", userID, "channel", channelID, "error", err)
	} else {
		logger.Info("reads: upsertUnread ok", "user", userID, "channel", channelID)
	}
	return err
}

func (s *Service) upsertNotificationsBatch(unreadIDs, mentionIDs []string, channelID string) error {
	if len(unreadIDs) == 0 && len(mentionIDs) == 0 {
		return nil
	}
	_, err := s.db.Exec(`
		WITH unread_inputs AS (
			SELECT u FROM unnest($1::text[]) AS u
		), mention_inputs AS (
			SELECT u FROM unnest($2::text[]) AS u
		), all_users AS (
			SELECT u FROM unread_inputs
			UNION
			SELECT u FROM mention_inputs
			ORDER BY u
		)
		INSERT INTO notifications (user_id, channel_id, unread, mentions)
		SELECT a.u, $3,
			CASE WHEN EXISTS (SELECT 1 FROM unread_inputs WHERE u = a.u) THEN 1 ELSE 0 END,
			CASE WHEN EXISTS (SELECT 1 FROM mention_inputs WHERE u = a.u) THEN 1 ELSE 0 END
		FROM all_users a
		ON CONFLICT (user_id, channel_id) DO UPDATE SET
			unread = notifications.unread + EXCLUDED.unread,
			mentions = notifications.mentions + EXCLUDED.mentions
	`, pq.Array(unreadIDs), pq.Array(mentionIDs), channelID)
	if err != nil {
		logger.Error("reads: upsertNotificationsBatch failed", "channel", channelID, "unread", len(unreadIDs), "mentions", len(mentionIDs), "error", err)
	} else {
		logger.Info("reads: upsertNotificationsBatch ok", "channel", channelID, "unread", len(unreadIDs), "mentions", len(mentionIDs))
	}
	return err
}

func (s *Service) upsertMention(userID, channelID string) error {
	_, err := s.db.Exec(`INSERT INTO notifications (user_id, channel_id, mentions) VALUES ($1, $2, 1) ON CONFLICT (user_id, channel_id) DO UPDATE SET mentions = notifications.mentions + 1`, userID, channelID)
	return err
}

func (s *Service) getUnreads(userID string) ([]ReadRow, error) {
	rows, err := s.db.Query(`SELECT n.channel_id, COALESCE(c.guild_id, ''), n.unread, n.mentions FROM notifications n LEFT JOIN channels c ON c.id = n.channel_id WHERE n.user_id = $1 AND (n.unread > 0 OR n.mentions > 0)`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ReadRow
	for rows.Next() {
		var r ReadRow
		if rows.Scan(&r.ChannelID, &r.GuildID, &r.Unread, &r.Mentions) == nil {
			out = append(out, r)
		}
	}
	logger.Info("reads: getUnreads", "user", userID, "rows", len(out))
	return out, nil
}

func (s *Service) markRead(userID, channelID string) {
	s.db.Exec(`UPDATE notifications SET unread = 0, mentions = 0 WHERE user_id = $1 AND channel_id = $2`, userID, channelID)
}

func (s *Service) getMessageAuthor(messageID string) string {
	var uid string
	s.db.QueryRow(`SELECT user_id FROM messages WHERE id = $1`, messageID).Scan(&uid)
	return uid
}