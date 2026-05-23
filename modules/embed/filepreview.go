package embed

import (
	"strings"
	"unicode/utf8"
)

const (
	maxInlinePreviewBytes = 64 * 1024
	maxPreviewLines       = 200
)

type FilePreview struct {
	Kind        string `json:"kind"`
	Language    string `json:"language,omitempty"`
	Filename    string `json:"filename"`
	Size        int64  `json:"size"`
	MimeType    string `json:"mime_type"`
	Truncated   bool   `json:"truncated"`
	Content     string `json:"content,omitempty"`
	LineCount   int    `json:"line_count,omitempty"`
	ByteCount   int    `json:"byte_count,omitempty"`
}

var languageByExt = map[string]string{
	".py":     "python",
	".pyw":    "python",
	".pyi":    "python",
	".js":     "javascript",
	".mjs":    "javascript",
	".cjs":    "javascript",
	".jsx":    "jsx",
	".ts":     "typescript",
	".tsx":    "tsx",
	".go":     "go",
	".rs":     "rust",
	".c":      "c",
	".h":      "c",
	".cpp":    "cpp",
	".hpp":    "cpp",
	".cc":     "cpp",
	".cs":     "csharp",
	".java":   "java",
	".kt":     "kotlin",
	".swift":  "swift",
	".rb":     "ruby",
	".php":    "php",
	".pl":     "perl",
	".lua":    "lua",
	".r":      "r",
	".dart":   "dart",
	".scala":  "scala",
	".sh":     "bash",
	".bash":   "bash",
	".zsh":    "bash",
	".fish":   "fish",
	".ps1":    "powershell",
	".bat":    "batch",
	".cmd":    "batch",
	".html":   "html",
	".htm":    "html",
	".xml":    "xml",
	".svg":    "xml",
	".css":    "css",
	".scss":   "scss",
	".sass":   "sass",
	".less":   "less",
	".json":   "json",
	".jsonl":  "json",
	".ndjson": "json",
	".yaml":   "yaml",
	".yml":    "yaml",
	".toml":   "toml",
	".ini":    "ini",
	".cfg":    "ini",
	".conf":   "ini",
	".env":    "bash",
	".md":     "markdown",
	".markdown": "markdown",
	".rst":    "rst",
	".tex":    "latex",
	".sql":    "sql",
	".graphql": "graphql",
	".gql":    "graphql",
	".proto":  "protobuf",
	".thrift": "thrift",
	".dockerfile": "dockerfile",
	".makefile":   "makefile",
	".cmake":  "cmake",
	".vim":    "vim",
	".el":     "lisp",
	".clj":    "clojure",
	".ex":     "elixir",
	".exs":    "elixir",
	".erl":    "erlang",
	".hs":     "haskell",
	".ml":     "ocaml",
	".f90":    "fortran",
	".pas":    "pascal",
	".csv":    "csv",
	".tsv":    "tsv",
	".log":    "log",
	".diff":   "diff",
	".patch":  "diff",
	".gitignore": "gitignore",
	".editorconfig": "ini",
	".txt":    "text",
}

var textMimeTypes = map[string]bool{
	"text/plain":              true,
	"text/markdown":           true,
	"text/csv":                true,
	"text/tab-separated-values": true,
	"text/html":               true,
	"text/xml":                true,
	"text/css":                true,
	"text/javascript":         true,
	"application/json":        true,
	"application/xml":         true,
	"application/x-yaml":      true,
	"application/yaml":        true,
	"application/toml":        true,
	"application/x-sh":        true,
	"application/x-python":    true,
	"application/javascript":  true,
	"application/typescript":  true,
}

var bareNameToLang = map[string]string{
	"dockerfile":     "dockerfile",
	"makefile":       "makefile",
	"gnumakefile":    "makefile",
	"cmakelists.txt": "cmake",
	"jenkinsfile":    "groovy",
	"vagrantfile":    "ruby",
	"gemfile":        "ruby",
	"rakefile":       "ruby",
	"procfile":       "yaml",
}

func detectLanguage(filename, mimeType string) string {
	lower := strings.ToLower(filename)
	if lang, ok := bareNameToLang[lower]; ok {
		return lang
	}
	if strings.HasPrefix(lower, "dockerfile") {
		return "dockerfile"
	}
	for ext, lang := range languageByExt {
		if strings.HasSuffix(lower, ext) {
			return lang
		}
	}
	if strings.HasPrefix(mimeType, "text/") {
		return "text"
	}
	return ""
}

func IsTextLike(filename, mimeType string, sample []byte) bool {
	if textMimeTypes[strings.ToLower(strings.TrimSpace(mimeType))] {
		return true
	}
	if strings.HasPrefix(mimeType, "text/") {
		return true
	}
	if detectLanguage(filename, mimeType) != "" {
		if isProbablyText(sample) {
			return true
		}
	}
	return false
}

func isProbablyText(b []byte) bool {
	if len(b) == 0 {
		return true
	}
	if !utf8.Valid(b) {
		nonprint := 0
		for _, c := range b {
			if c == 0 {
				return false
			}
			if c < 9 || (c > 13 && c < 32) {
				nonprint++
			}
		}
		if float64(nonprint)/float64(len(b)) > 0.05 {
			return false
		}
	}
	return true
}

func BuildFilePreview(filename, mimeType string, size int64, fullData []byte) *FilePreview {
	if !IsTextLike(filename, mimeType, fullData[:min(len(fullData), 512)]) {
		return nil
	}
	preview := &FilePreview{
		Kind:     "code",
		Filename: filename,
		Size:     size,
		MimeType: mimeType,
		Language: detectLanguage(filename, mimeType),
	}
	if preview.Language == "" {
		preview.Language = "text"
	}

	contentBytes := fullData
	if len(contentBytes) > maxInlinePreviewBytes {
		contentBytes = contentBytes[:maxInlinePreviewBytes]
		preview.Truncated = true
	}
	preview.ByteCount = len(contentBytes)
	content := string(contentBytes)

	if !utf8.ValidString(content) {
		var b strings.Builder
		b.Grow(len(content))
		for i := 0; i < len(content); {
			r, size := utf8.DecodeRuneInString(content[i:])
			if r == utf8.RuneError && size == 1 {
				b.WriteRune('\uFFFD')
				i++
			} else {
				b.WriteRune(r)
				i += size
			}
		}
		content = b.String()
	}

	lines := strings.SplitN(content, "\n", maxPreviewLines+1)
	if len(lines) > maxPreviewLines {
		content = strings.Join(lines[:maxPreviewLines], "\n")
		preview.Truncated = true
		preview.LineCount = maxPreviewLines
	} else {
		preview.LineCount = len(lines)
		if preview.LineCount > 0 && lines[preview.LineCount-1] == "" {
			preview.LineCount--
		}
	}
	preview.Content = content
	return preview
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
