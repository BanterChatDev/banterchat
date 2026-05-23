package pagination

func Slice[T any](items []T, offset, limit int) (page []T, total int, hasMore bool) {
	total = len(items)
	if offset > total {
		offset = total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return items[offset:end], total, end < total
}