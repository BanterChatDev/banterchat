package defaults

// Entry is one default emoji shipped with the app.
type Entry struct {
	Name     string
	File     string
	Category string
}

// CategoryIcon names the default emoji that represents a category in
// the picker UI.
type CategoryIcon struct {
	Category  string
	EmojiName string
}

var (
	entries        []Entry
	categoryIcons  []CategoryIcon
)

// register is called from the init() in each per-category file.
func register(name, file, category string) {
	entries = append(entries, Entry{Name: name, File: file, Category: category})
}

// registerCategoryIcon is called from categories.go's init().
func registerCategoryIcon(category, emojiName string) {
	categoryIcons = append(categoryIcons, CategoryIcon{Category: category, EmojiName: emojiName})
}

// All returns every registered default emoji. The returned slice is
// the package's own — callers must not mutate it.
func All() []Entry {
	return entries
}

// Lookup returns the entry for the given name, if registered.
func Lookup(name string) (Entry, bool) {
	for _, e := range entries {
		if e.Name == name {
			return e, true
		}
	}
	return Entry{}, false
}

// CategoryIcons returns the configured category-icon mapping.
func CategoryIcons() []CategoryIcon {
	return categoryIcons
}