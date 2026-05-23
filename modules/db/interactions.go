package db

import (
	"time"
)

// Interaction lifecycle:
//   invoked: user sends WS slash_command → server creates row with status='pending'
//   bot ACKs: bot sends POST /interactions/:id/respond with kind=defer → status='deferred'
//   bot replies: bot sends kind=reply → status='responded', message row also persisted
//   bot follows up: each followup writes a message but leaves the interaction at 'responded'
//   expired: background sweep at created_at + TTL flips pending/deferred → 'expired'.
//
// The token column holds the short-lived bearer the bot uses to prove
// ownership on every /respond call. Never exposed to the invoker.

const InteractionTTL = 15 * time.Minute

const (
	InteractionStatusPending   = "pending"
	InteractionStatusDeferred  = "deferred"
	InteractionStatusResponded = "responded"
	InteractionStatusExpired   = "expired"
)

type InteractionRow struct {
	ID              string
	Token           string
	AppID           string
	BotUserID       string
	InvokerUserID   string
	ChannelID       string
	GuildID         string
	CommandName     string
	OptionsJSON     string
	Status          string
	Ephemeral       bool
	SourceMessageID string
	CustomID        string
	CreatedAt       time.Time
	ExpiresAt       time.Time
}

// CreateInteraction writes a pending interaction row. Caller is
// responsible for generating the id + token; this just persists.
func (d *DB) CreateInteraction(r InteractionRow) error {
	_, err := d.Exec(
		`INSERT INTO interactions (id, token, app_id, bot_user_id, invoker_user_id,
		 channel_id, guild_id, command_name, options_json, status, ephemeral,
		 source_message_id, custom_id, created_at, expires_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		r.ID, r.Token, r.AppID, r.BotUserID, r.InvokerUserID, r.ChannelID, r.GuildID,
		r.CommandName, r.OptionsJSON, r.Status, r.Ephemeral, r.SourceMessageID, r.CustomID, r.CreatedAt, r.ExpiresAt,
	)
	return err
}

// GetInteraction returns one interaction, or sql.ErrNoRows if not found.
// Used on every /respond call to authz the requester.
func (d *DB) GetInteraction(id string) (*InteractionRow, error) {
	r := &InteractionRow{}
	err := d.QueryRow(
		`SELECT id, token, app_id, bot_user_id, invoker_user_id, channel_id, guild_id,
		 command_name, options_json, status, ephemeral, source_message_id, custom_id, created_at, expires_at
		 FROM interactions WHERE id = $1`, id,
	).Scan(
		&r.ID, &r.Token, &r.AppID, &r.BotUserID, &r.InvokerUserID, &r.ChannelID, &r.GuildID,
		&r.CommandName, &r.OptionsJSON, &r.Status, &r.Ephemeral, &r.SourceMessageID, &r.CustomID, &r.CreatedAt, &r.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// UpdateInteractionStatus moves an interaction between lifecycle states.
// No-op if the row doesn't exist.
func (d *DB) UpdateInteractionStatus(id, status string) error {
	_, err := d.Exec(`UPDATE interactions SET status = $1 WHERE id = $2`, status, id)
	return err
}

// ExpireStaleInteractions flips any pending/deferred rows past their
// expires_at to 'expired'. Called from a background sweep; cheap enough
// to run every minute even on a busy server.
func (d *DB) ExpireStaleInteractions(now time.Time) (int64, error) {
	res, err := d.Exec(
		`UPDATE interactions
		 SET status = $1
		 WHERE status IN ($2, $3) AND expires_at < $4`,
		InteractionStatusExpired,
		InteractionStatusPending, InteractionStatusDeferred,
		now,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}