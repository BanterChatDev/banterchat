package messages

import (
	"encoding/json"
	"fmt"
	"regexp"
)

func ValidateMessageContent(content string, cfg Config) error {
	if len(content) > cfg.MaxLength {
		return fmt.Errorf(errFmtTooLong, cfg.MaxLength)
	}
	return nil
}

// ValidateVoiceSend enforces voice-message structural rules:
// flag IS_VOICE_MESSAGE requires exactly one attachment, no embed,
// no components, and forces content to empty (Discord parity). Returns
// nil if the request is not a voice message.
func ValidateVoiceSend(req *SendReq, attCount int) error {
	if req.Flags&FlagVoiceMessage == 0 {
		return nil
	}
	if attCount != 1 {
		return ErrInvalidRequest
	}
	if len(req.Embed) > 0 || len(req.Components) > 0 {
		return ErrInvalidRequest
	}
	req.Content = ""
	return nil
}

var customEmojiRE = regexp.MustCompile(`<a?:[a-zA-Z0-9_]{1,32}:([a-f0-9]+)>`)

func ExtractEmojiIDs(content string) []string {
	matches := customEmojiRE.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return nil
	}
	out := make([]string, 0, len(matches))
	seen := make(map[string]bool, len(matches))
	for _, m := range matches {
		id := m[1]
		if seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

const (
	maxActionRows       = 5
	maxButtonsPerRow    = 5
	maxCustomIDLength   = 100
	maxButtonLabelLen   = 80
	maxURLLength        = 512
)

var allowedButtonStyles = map[string]bool{
	"primary": true, "secondary": true, "success": true, "danger": true, "link": true,
}

type actionRow struct {
	Type       string         `json:"type"`
	Components []buttonSpec   `json:"components"`
}
type buttonSpec struct {
	Type     string `json:"type"`
	Style    string `json:"style"`
	Label    string `json:"label"`
	Emoji    string `json:"emoji,omitempty"`
	CustomID string `json:"custom_id,omitempty"`
	URL      string `json:"url,omitempty"`
	Disabled bool   `json:"disabled,omitempty"`
}

func ValidateComponents(raw json.RawMessage) (string, error) {
	var rows []actionRow
	if err := json.Unmarshal(raw, &rows); err != nil {
		return "", fmt.Errorf("components must be an array of action rows")
	}
	if len(rows) == 0 {
		return "", nil
	}
	if len(rows) > maxActionRows {
		return "", fmt.Errorf("too many action rows (max %d)", maxActionRows)
	}
	for i, r := range rows {
		if r.Type != "action_row" {
			return "", fmt.Errorf("row %d: type must be 'action_row'", i)
		}
		if len(r.Components) == 0 {
			return "", fmt.Errorf("row %d: no components", i)
		}
		if len(r.Components) > maxButtonsPerRow {
			return "", fmt.Errorf("row %d: too many components (max %d)", i, maxButtonsPerRow)
		}
		for j, b := range r.Components {
			if b.Type != "button" {
				return "", fmt.Errorf("row %d component %d: only buttons supported", i, j)
			}
			if !allowedButtonStyles[b.Style] {
				return "", fmt.Errorf("row %d component %d: invalid style %q", i, j, b.Style)
			}
			if len(b.Label) == 0 || len(b.Label) > maxButtonLabelLen {
				return "", fmt.Errorf("row %d component %d: label length 1..%d required", i, j, maxButtonLabelLen)
			}
			if b.Style == "link" {
				if b.URL == "" || len(b.URL) > maxURLLength {
					return "", fmt.Errorf("row %d component %d: link button requires url", i, j)
				}
				if b.CustomID != "" {
					return "", fmt.Errorf("row %d component %d: link buttons must not have custom_id", i, j)
				}
			} else {
				if b.CustomID == "" || len(b.CustomID) > maxCustomIDLength {
					return "", fmt.Errorf("row %d component %d: custom_id length 1..%d required", i, j, maxCustomIDLength)
				}
			}
		}
	}
	canonical, err := json.Marshal(rows)
	if err != nil {
		return "", err
	}
	return string(canonical), nil
}