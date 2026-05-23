package embed

import "time"

type Field struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline,omitempty"`
}

type Author struct {
	Name             string `json:"name,omitempty"`
	URL              string `json:"url,omitempty"`
	IconURL          string `json:"icon_url,omitempty"`
	IconAttachmentID string `json:"icon_attachment_id,omitempty"`
}

type Footer struct {
	Text             string `json:"text,omitempty"`
	IconURL          string `json:"icon_url,omitempty"`
	IconAttachmentID string `json:"icon_attachment_id,omitempty"`
}

type Image struct {
	URL          string `json:"url,omitempty"`
	AttachmentID string `json:"attachment_id,omitempty"`
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
}

type Embed struct {
	Title       string     `json:"title,omitempty"`
	Description string     `json:"description,omitempty"`
	URL         string     `json:"url,omitempty"`
	Color       string     `json:"color,omitempty"`
	Timestamp   *time.Time `json:"timestamp,omitempty"`
	Fields      []Field    `json:"fields,omitempty"`
	Thumbnail   *Image     `json:"thumbnail,omitempty"`
	Image       *Image     `json:"image,omitempty"`
	Footer      *Footer    `json:"footer,omitempty"`
	Author      *Author    `json:"author,omitempty"`
	Type        string     `json:"type,omitempty"`
	Provider    string     `json:"provider,omitempty"`
}
