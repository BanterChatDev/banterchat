package attachments

import (
	"html/template"

	"ror/modules/db"
	"ror/modules/fileutil"
)

type Attachment struct {
	ID           string  `json:"id"`
	Filename     string  `json:"filename"`
	MimeType     string  `json:"mime_type"`
	Size         int64   `json:"size"`
	Width        int     `json:"width,omitempty"`
	Height       int     `json:"height,omitempty"`
	FilePreview  string  `json:"file_preview,omitempty"`
	Flags        int64   `json:"flags,omitempty"`
	DurationSecs float64 `json:"duration_secs,omitempty"`
	Waveform     string  `json:"waveform,omitempty"`
}

type Service struct {
	db           *db.DB
	cfg          Config
	masterKey    string
	pageTemplate *template.Template
}

func NewService(db *db.DB, cfg Config, masterKey string, pageTemplate *template.Template) *Service {
	fileutil.EnsureDir(cfg.StoragePath)
	return &Service{
		db:           db,
		cfg:          cfg,
		masterKey:    masterKey,
		pageTemplate: pageTemplate,
	}
}