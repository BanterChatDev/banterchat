package discovery

import (
	"strings"
)

const (
	MinSlugLen   = 3
	MaxSlugLen   = 32
	MaxBioLen    = 600
	MaxTags      = 10
	MaxTagLen    = 24
	MinTagLen    = 2
)

var supportedLanguages = map[string]struct{}{
	"en": {}, "es": {}, "fr": {}, "de": {}, "it": {}, "pt": {}, "nl": {},
	"sv": {}, "pl": {}, "ru": {}, "tr": {}, "ar": {}, "he": {}, "ja": {},
	"ko": {}, "zh": {}, "hi": {}, "id": {}, "vi": {}, "th": {},
}

var reservedSlugs = map[string]struct{}{
	"":         {},
	"api":      {},
	"admin":    {},
	"search":   {},
	"tag":      {},
	"tags":     {},
	"category": {},
	"sitemap":  {},
	"robots":   {},
	"static":   {},
	"assets":   {},
	"public":   {},
	"about":    {},
	"terms":    {},
	"privacy":  {},
	"help":     {},
	"login":    {},
	"register": {},
	"new":      {},
	"edit":     {},
	"settings": {},
	"rss":      {},
	"feed":     {},
	"_":        {},
}

func ValidateSlug(slug string) error {
	s := strings.ToLower(strings.TrimSpace(slug))
	if len(s) < MinSlugLen || len(s) > MaxSlugLen {
		return ErrSlugInvalid
	}
	if _, ok := reservedSlugs[s]; ok {
		return ErrSlugInvalid
	}
	if s[0] == '-' || s[len(s)-1] == '-' {
		return ErrSlugInvalid
	}
	prevDash := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		isLower := c >= 'a' && c <= 'z'
		isDigit := c >= '0' && c <= '9'
		isDash := c == '-'
		if !isLower && !isDigit && !isDash {
			return ErrSlugInvalid
		}
		if isDash && prevDash {
			return ErrSlugInvalid
		}
		prevDash = isDash
	}
	return nil
}

func NormalizeSlug(slug string) string {
	return strings.ToLower(strings.TrimSpace(slug))
}

func ValidateBio(bio string) bool {
	return len(strings.TrimSpace(bio)) <= MaxBioLen
}

func NormalizeTags(raw string) []string {
	parts := strings.Split(raw, ",")
	seen := make(map[string]struct{}, len(parts))
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.ToLower(strings.TrimSpace(p))
		if len(t) < MinTagLen || len(t) > MaxTagLen {
			continue
		}
		if _, ok := seen[t]; ok {
			continue
		}
		valid := true
		for i := 0; i < len(t); i++ {
			c := t[i]
			if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == ' ') {
				valid = false
				break
			}
		}
		if !valid {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
		if len(out) >= MaxTags {
			break
		}
	}
	return out
}

func NormalizeLanguage(lang string) string {
	l := strings.ToLower(strings.TrimSpace(lang))
	if l == "" {
		return "en"
	}
	if _, ok := supportedLanguages[l]; !ok {
		return "en"
	}
	return l
}