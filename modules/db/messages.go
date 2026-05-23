package db

import (
	"database/sql"
	"fmt"
	"strings"
)

type MessageRow struct {
	ID            string
	GuildID       string
	ChannelID     string
	UserID        string
	Content       string
	Type          string
	SystemType    string
	Meta          string
	EmbedData     string
	Components    string
	AuthorPerms   int64
	ReplyTo       string
	CreatedAt     string
	CommandName   string
	CommandArgs   string
	InvokerID     string
	InteractionID string
	Flags         int64
}

func (d *DB) InsertMessageRow(r MessageRow) error {
	if r.Type == "" {
		r.Type = "user"
	}
	var userID interface{} = r.UserID
	if r.UserID == "" {
		userID = nil
	}
	if r.GuildID == "" && r.ChannelID != "" {
		r.GuildID = d.GetChannelGuildID(r.ChannelID)
	}
	_, err := d.Exec(
		`INSERT INTO messages
		  (id, guild_id, channel_id, user_id, content, type, system_type, meta,
		   embed_data, components, author_perms, reply_to, created_at,
		   command_name, command_args, invoker_id, interaction_id, flags)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
		r.ID, r.GuildID, r.ChannelID, userID, r.Content, r.Type, r.SystemType, r.Meta,
		r.EmbedData, r.Components, r.AuthorPerms, r.ReplyTo, r.CreatedAt,
		r.CommandName, r.CommandArgs, r.InvokerID, r.InteractionID, r.Flags,
	)
	return err
}

func (d *DB) GetMessageRow(id string) (msgID, channelID, userID, username, content string, authorPerms int64, edited bool, replyTo, createdAt, commandName, commandArgs, msgType, embedData, invokerID string, err error) {
	err = d.QueryRow(`SELECT m.id, m.channel_id, COALESCE(m.user_id, ''), COALESCE(u.username, ''), m.content, m.author_perms, m.edited, m.reply_to, m.created_at, m.command_name, m.command_args, m.type, m.embed_data, m.invoker_id FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = $1`, id).
		Scan(&msgID, &channelID, &userID, &username, &content, &authorPerms, &edited, &replyTo, &createdAt, &commandName, &commandArgs, &msgType, &embedData, &invokerID)
	return
}

func (d *DB) GetMessageAuthz(id string) (channelID, userID, systemType, metaJSON string, err error) {
	err = d.QueryRow(
		`SELECT m.channel_id, COALESCE(m.user_id, ''), COALESCE(m.system_type, ''), COALESCE(m.meta, '') FROM messages m WHERE m.id = $1`, id,
	).Scan(&channelID, &userID, &systemType, &metaJSON)
	return
}

func (d *DB) UpdateMessageContent(id, content string) error {
	_, err := d.Exec(`UPDATE messages SET content = $1, edited = true WHERE id = $2`, content, id)
	return err
}

func (d *DB) UpdateMessageEmbed(id, embedJSON string) error {
	_, err := d.Exec(`UPDATE messages SET embed_data = $1 WHERE id = $2`, embedJSON, id)
	return err
}

func (d *DB) UpdateMessageComponents(id, componentsJSON string) error {
	_, err := d.Exec(`UPDATE messages SET components = $1 WHERE id = $2`, componentsJSON, id)
	return err
}

func (d *DB) UpdateMessageContentOnly(id, content string) error {
	_, err := d.Exec(`UPDATE messages SET content = $1 WHERE id = $2`, content, id)
	return err
}

func (d *DB) DeleteMessage(id string) error {
	_, err := d.Exec(`DELETE FROM messages WHERE id = $1`, id)
	return err
}

func (d *DB) DeleteMessagesByChannel(channelID string) {
	d.Exec(`DELETE FROM messages WHERE channel_id = $1`, channelID)
}

func (d *DB) DeleteUserMessagesInGuild(guildID, userID string) (map[string][]string, error) {
	rows, err := d.Query(`
		DELETE FROM messages
		WHERE guild_id = $1
		  AND (
		    user_id = $2
		    OR (system_type <> '' AND meta <> '' AND (meta::jsonb->>'user_id') = $2)
		  )
		RETURNING channel_id, id`, guildID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[string][]string)
	for rows.Next() {
		var channelID, msgID string
		if rows.Scan(&channelID, &msgID) == nil {
			out[channelID] = append(out[channelID], msgID)
		}
	}
	return out, nil
}

// _messageListCols is the shared SELECT column list for every
// list-messages query. Extracted as a constant so the 5 list helpers
// below all scan the same shape.
const _messageListCols = `m.id, m.channel_id, COALESCE(m.user_id, '') AS user_id, COALESCE(u.username, '') AS username, m.content, m.author_perms, m.edited, m.reply_to, m.created_at, m.command_name, m.command_args, m.type, m.embed_data, m.invoker_id, m.interaction_id, m.system_type, COALESCE(m.meta, '') AS meta, COALESCE(m.components, '') AS components, COALESCE(m.flags, 0) AS flags`

func (d *DB) ListMessagesBefore(channelID, before string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT `+_messageListCols+` FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 AND m.created_at < $2 ORDER BY m.created_at DESC LIMIT $3`, channelID, before, limit)
}

func (d *DB) ListMessagesLatest(channelID string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT `+_messageListCols+` FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 ORDER BY m.created_at DESC LIMIT $2`, channelID, limit)
}

func (d *DB) ListMessagesAfter(channelID, after string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT `+_messageListCols+` FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 AND m.created_at > $2 ORDER BY m.created_at ASC LIMIT $3`, channelID, after, limit)
}

func (d *DB) ListMessagesAroundBefore(channelID, targetTime string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT `+_messageListCols+` FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 AND m.created_at <= $2 ORDER BY m.created_at DESC LIMIT $3`, channelID, targetTime, limit)
}

func (d *DB) ListMessagesAroundAfter(channelID, targetTime string, limit int) (*sql.Rows, error) {
	return d.Query(`SELECT `+_messageListCols+` FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.channel_id = $1 AND m.created_at > $2 ORDER BY m.created_at ASC LIMIT $3`, channelID, targetTime, limit)
}

func (d *DB) GetMessageTime(id, channelID string) (string, error) {
	var t string
	err := d.QueryRow(`SELECT created_at FROM messages WHERE id = $1 AND channel_id = $2`, id, channelID).Scan(&t)
	return t, err
}

func (d *DB) GetReplyData(messageID string) (userID, channelID, content string, authorPerms int64, embedData string, err error) {
	err = d.QueryRow(`SELECT COALESCE(user_id, ''), channel_id, content, author_perms, COALESCE(embed_data, '') FROM messages WHERE id = $1`, messageID).Scan(&userID, &channelID, &content, &authorPerms, &embedData)
	return
}

type ReplyRow struct {
	ID          string
	UserID      string
	ChannelID   string
	Content     string
	AuthorPerms int64
	EmbedData   string
}

func (d *DB) GetReplyDataBatch(messageIDs []string) (map[string]ReplyRow, error) {
	if len(messageIDs) == 0 {
		return nil, nil
	}
	ph := make([]string, len(messageIDs))
	args := make([]interface{}, len(messageIDs))
	for i, id := range messageIDs {
		ph[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	rows, err := d.Query(`SELECT id, COALESCE(user_id, ''), channel_id, content, author_perms, COALESCE(embed_data, '') FROM messages WHERE id IN (`+strings.Join(ph, ",")+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]ReplyRow)
	for rows.Next() {
		var r ReplyRow
		if rows.Scan(&r.ID, &r.UserID, &r.ChannelID, &r.Content, &r.AuthorPerms, &r.EmbedData) == nil {
			result[r.ID] = r
		}
	}
	return result, nil
}

func (d *DB) ListMessageIDsByChannel(channelID string, limit int) ([]string, error) {
	rows, err := d.Query(`SELECT id FROM messages WHERE channel_id = $1 ORDER BY created_at DESC LIMIT $2`, channelID, limit)
	if err != nil { return nil, err }
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil { ids = append(ids, id) }
	}
	return ids, nil
}

func (d *DB) GetTopRoleForUserInGuild(userID, guildID string) (topID, topName, topColor string) {
	if guildID == "" {
		return "", "", ""
	}
	rolesStr := d.GetGuildMemberRoles(guildID, userID)
	if rolesStr == "" { return "", "", "" }
	parts := strings.Split(rolesStr, ",")
	ph := make([]string, 0, len(parts))
	args := make([]interface{}, 0, len(parts))
	for _, rid := range parts {
		rid = strings.TrimSpace(rid)
		if rid != "" {
			ph = append(ph, fmt.Sprintf("$%d", len(ph)+1))
			args = append(args, rid)
		}
	}
	if len(ph) == 0 { return "", "", "" }
	err := d.QueryRow(`SELECT id, name, color FROM roles WHERE id IN (`+strings.Join(ph, ",")+`) ORDER BY position ASC LIMIT 1`, args...).Scan(&topID, &topName, &topColor)
	if err != nil { return "", "", "" }
	return
}

type RoleMini struct {
	ID    string
	Name  string
	Color string
}

func (d *DB) GetTopRolesForUsersInGuild(userIDs []string, guildID string) map[string]RoleMini {
	if guildID == "" || len(userIDs) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(userIDs))
	uniq := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniq = append(uniq, id)
	}
	if len(uniq) == 0 {
		return nil
	}
	ph := make([]string, len(uniq))
	args := make([]interface{}, 0, len(uniq)+1)
	args = append(args, guildID)
	for i, id := range uniq {
		ph[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, id)
	}
	rows, err := d.Query(`
		SELECT DISTINCT ON (gm.user_id) gm.user_id, r.id, r.name, r.color
		FROM guild_members gm
		JOIN roles r ON r.id = ANY(string_to_array(gm.roles, ','))
		WHERE gm.guild_id = $1 AND gm.user_id IN (`+strings.Join(ph, ",")+`) AND r.guild_id = $1
		ORDER BY gm.user_id, r.position ASC`, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make(map[string]RoleMini, len(uniq))
	for rows.Next() {
		var uid string
		var rm RoleMini
		if rows.Scan(&uid, &rm.ID, &rm.Name, &rm.Color) == nil {
			out[uid] = rm
		}
	}
	return out
}