package db

import "time"

type FriendRow struct {
	ID         string
	FromUserID string
	ToUserID   string
	Status     string
	CreatedAt  time.Time
}

func (d *DB) InsertFriendRequest(id, fromID, toID string) error {
	_, err := d.Exec(`INSERT INTO friends (id, from_user_id, to_user_id, status) VALUES ($1, $2, $3, 'pending')`, id, fromID, toID)
	return err
}

func (d *DB) GetFriendPair(userA, userB string) (*FriendRow, error) {
	var r FriendRow
	err := d.QueryRow(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)`, userA, userB).
		Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (d *DB) AcceptFriend(id string) error {
	_, err := d.Exec(`UPDATE friends SET status = 'accepted' WHERE id = $1 AND status = 'pending'`, id)
	return err
}

func (d *DB) DeleteFriend(id string) error {
	_, err := d.Exec(`DELETE FROM friends WHERE id = $1`, id)
	return err
}

func (d *DB) ListFriends(userID, status string) ([]FriendRow, error) {
	rows, err := d.Query(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE (from_user_id = $1 OR to_user_id = $1) AND status = $2 ORDER BY created_at DESC`, userID, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FriendRow
	for rows.Next() {
		var r FriendRow
		if rows.Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) ListPendingIncoming(userID string) ([]FriendRow, error) {
	rows, err := d.Query(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE to_user_id = $1 AND status = 'pending' ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FriendRow
	for rows.Next() {
		var r FriendRow
		if rows.Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) GetFriendByID(id string) (*FriendRow, error) {
	var r FriendRow
	err := d.QueryRow(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE id = $1`, id).
		Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (d *DB) InsertBlock(id, fromID, toID string) error {
	_, err := d.Exec(`INSERT INTO friends (id, from_user_id, to_user_id, status) VALUES ($1, $2, $3, 'blocked')`, id, fromID, toID)
	return err
}

func (d *DB) DeleteBlock(fromID, toID string) error {
	_, err := d.Exec(`DELETE FROM friends WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'blocked'`, fromID, toID)
	return err
}

func (d *DB) DeleteAnyRelation(userA, userB string) error {
	_, err := d.Exec(`DELETE FROM friends WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)`, userA, userB)
	return err
}

func (d *DB) IsBlockedEitherWay(userA, userB string) bool {
	var n int
	d.QueryRow(`SELECT COUNT(*) FROM friends WHERE status = 'blocked' AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))`, userA, userB).Scan(&n)
	return n > 0
}

func (d *DB) ListBlocks(userID string) ([]FriendRow, error) {
	rows, err := d.Query(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE from_user_id = $1 AND status = 'blocked' ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FriendRow
	for rows.Next() {
		var r FriendRow
		if rows.Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

// ListBlockedBy returns rows where the given user is the target of a block —
// i.e. other users who have blocked this user. The returned row's
// FromUserID is the blocker and ToUserID is the given userID.
func (d *DB) ListBlockedBy(userID string) ([]FriendRow, error) {
	rows, err := d.Query(`SELECT id, from_user_id, to_user_id, status, created_at FROM friends WHERE to_user_id = $1 AND status = 'blocked' ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FriendRow
	for rows.Next() {
		var r FriendRow
		if rows.Scan(&r.ID, &r.FromUserID, &r.ToUserID, &r.Status, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}