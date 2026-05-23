package db

import "time"

type ReportRow struct {
	ID               string
	ReporterID       string
	TargetType       string
	TargetID         string
	Reason           string
	Status           string
	ResolvedBy       *string
	ResolvedAt       *time.Time
	ResolutionAction string
	CreatedAt        time.Time
}

func (d *DB) InsertReport(id, reporterID, targetType, targetID, reason string) error {
	_, err := d.Exec(
		`INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES ($1, $2, $3, $4, $5)`,
		id, reporterID, targetType, targetID, reason,
	)
	return err
}

func (d *DB) ListReportsByStatus(status string) ([]ReportRow, error) {
	q := `SELECT id, reporter_id, target_type, target_id, reason, status, resolved_by, resolved_at, resolution_action, created_at FROM reports`
	var args []interface{}
	if status != "" && status != "all" {
		q += ` WHERE status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY created_at DESC LIMIT 500`
	rows, err := d.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ReportRow
	for rows.Next() {
		var r ReportRow
		if rows.Scan(&r.ID, &r.ReporterID, &r.TargetType, &r.TargetID, &r.Reason, &r.Status, &r.ResolvedBy, &r.ResolvedAt, &r.ResolutionAction, &r.CreatedAt) == nil {
			out = append(out, r)
		}
	}
	return out, nil
}

func (d *DB) GetReport(id string) (*ReportRow, error) {
	r := &ReportRow{}
	err := d.QueryRow(
		`SELECT id, reporter_id, target_type, target_id, reason, status, resolved_by, resolved_at, resolution_action, created_at FROM reports WHERE id = $1`, id,
	).Scan(&r.ID, &r.ReporterID, &r.TargetType, &r.TargetID, &r.Reason, &r.Status, &r.ResolvedBy, &r.ResolvedAt, &r.ResolutionAction, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func (d *DB) ResolveReport(id, resolvedBy, action string) error {
	_, err := d.Exec(
		`UPDATE reports SET status = 'resolved', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP, resolution_action = $2 WHERE id = $3 AND status = 'open'`,
		resolvedBy, action, id,
	)
	return err
}

func (d *DB) CountOpenReports() int {
	var c int
	d.QueryRow(`SELECT COUNT(*) FROM reports WHERE status = 'open'`).Scan(&c)
	return c
}