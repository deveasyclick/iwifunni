package ptr

// StrPtr returns a pointer to s, or nil if s is empty.
func StrPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Coalesce returns a if non-empty, otherwise falls back to *b (or "" if b is nil).
func Coalesce(a string, b *string) string {
	if a != "" {
		return a
	}
	if b != nil {
		return *b
	}
	return ""
}
