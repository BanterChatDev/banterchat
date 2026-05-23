package embed

import (
	"encoding/json"
	"strings"
)

type Limits struct {
	MaxFields    int
	MaxTitleLen  int
	MaxDescLen   int
	MaxFieldName int
	MaxFieldVal  int
	MaxFooterLen int
	MaxAuthorLen int
	MaxURLLen    int
}

func truncate(s string, max int) string {
	if max <= 0 || len(s) <= max {
		return s
	}
	return s[:max]
}

func (e *Embed) Validate(l Limits) {
	e.Title = truncate(e.Title, l.MaxTitleLen)
	e.Description = truncate(e.Description, l.MaxDescLen)
	e.URL = truncate(e.URL, l.MaxURLLen)
	if e.Footer != nil {
		e.Footer.Text = truncate(e.Footer.Text, l.MaxFooterLen)
		e.Footer.IconURL = truncate(e.Footer.IconURL, l.MaxURLLen)
	}
	if e.Author != nil {
		e.Author.Name = truncate(e.Author.Name, l.MaxAuthorLen)
		e.Author.URL = truncate(e.Author.URL, l.MaxURLLen)
		e.Author.IconURL = truncate(e.Author.IconURL, l.MaxURLLen)
	}
	if l.MaxFields > 0 && len(e.Fields) > l.MaxFields {
		e.Fields = e.Fields[:l.MaxFields]
	}
	for i := range e.Fields {
		e.Fields[i].Name = truncate(e.Fields[i].Name, l.MaxFieldName)
		e.Fields[i].Value = truncate(e.Fields[i].Value, l.MaxFieldVal)
	}
}

func ParseAndValidate(raw json.RawMessage, l Limits) (*Embed, string, error) {
	if len(raw) == 0 {
		return nil, "", nil
	}
	var e Embed
	if err := json.Unmarshal(raw, &e); err != nil {
		return nil, "", err
	}
	e.Validate(l)
	canonical, err := json.Marshal(&e)
	if err != nil {
		return nil, "", err
	}
	return &e, string(canonical), nil
}

const attachmentScheme = "attachment://"

func resolveAttachmentRef(url string, names map[string]string) (string, bool) {
	if url == "" {
		return "", false
	}
	if len(url) <= len(attachmentScheme) || url[:len(attachmentScheme)] != attachmentScheme {
		return "", false
	}
	key := strings.ToLower(url[len(attachmentScheme):])
	if id, ok := names[key]; ok {
		return id, true
	}
	return "", true
}

func (e *Embed) ResolveAttachmentRefs(names map[string]string) {
	if e.Image != nil {
		if id, isRef := resolveAttachmentRef(e.Image.URL, names); isRef {
			e.Image.URL = ""
			e.Image.AttachmentID = id
		}
	}
	if e.Thumbnail != nil {
		if id, isRef := resolveAttachmentRef(e.Thumbnail.URL, names); isRef {
			e.Thumbnail.URL = ""
			e.Thumbnail.AttachmentID = id
		}
	}
	if e.Author != nil {
		if id, isRef := resolveAttachmentRef(e.Author.IconURL, names); isRef {
			e.Author.IconURL = ""
			e.Author.IconAttachmentID = id
		}
	}
	if e.Footer != nil {
		if id, isRef := resolveAttachmentRef(e.Footer.IconURL, names); isRef {
			e.Footer.IconURL = ""
			e.Footer.IconAttachmentID = id
		}
	}
}

type configEmbedShape interface {
	GetMaxFields() int
	GetMaxTitleLen() int
	GetMaxDescLen() int
	GetMaxFieldName() int
	GetMaxFieldVal() int
	GetMaxFooterLen() int
	GetMaxAuthorLen() int
}

func LimitsFrom(c configEmbedShape) Limits {
	return Limits{
		MaxFields:    c.GetMaxFields(),
		MaxTitleLen:  c.GetMaxTitleLen(),
		MaxDescLen:   c.GetMaxDescLen(),
		MaxFieldName: c.GetMaxFieldName(),
		MaxFieldVal:  c.GetMaxFieldVal(),
		MaxFooterLen: c.GetMaxFooterLen(),
		MaxAuthorLen: c.GetMaxAuthorLen(),
		MaxURLLen:    2048,
	}
}
