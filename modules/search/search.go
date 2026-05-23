package search

import "strings"

func Normalize(q string) string {
	return strings.TrimSpace(strings.ToLower(q))
}

func Match(text, q string) bool {
	if q == "" {
		return true
	}
	return strings.Contains(strings.ToLower(text), q)
}

func Filter[T any](items []T, q string, getStr func(*T) string) []T {
	if q == "" {
		return items
	}
	out := make([]T, 0, len(items))
	for i := range items {
		if Match(getStr(&items[i]), q) {
			out = append(out, items[i])
		}
	}
	return out
}

func Paginate[T any](items []T, offset, limit int) (page []T, total int) {
	total = len(items)
	if offset < 0 {
		offset = 0
	}
	if offset > total {
		offset = total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return items[offset:end], total
}