package interactions

import (
	"encoding/json"
	"sort"
	"strconv"
	"strings"
)

// formatArgsForDisplay renders an options map as "key:value key:value"
// for the thinking-row preview and argsFromJSON's persisted form. Keys
// are sorted for stable output.
func formatArgsForDisplay(options map[string]interface{}) string {
	if len(options) == 0 {
		return ""
	}
	keys := make([]string, 0, len(options))
	for k := range options {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	for i, k := range keys {
		if i > 0 {
			b.WriteString(" ")
		}
		b.WriteString(k)
		b.WriteString(":")
		b.WriteString(scalarToString(options[k]))
	}
	return b.String()
}

func scalarToString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case bool:
		return strconv.FormatBool(t)
	case float64:
		if t == float64(int64(t)) {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'g', -1, 64)
	case nil:
		return ""
	default:
		b, _ := json.Marshal(v)
		return string(b)
	}
}

// argsFromJSON parses an interaction's OptionsJSON column and formats
// it for display. Empty/null inputs return "" so callers can direct
// assign to the command_args message column without an extra guard.
func argsFromJSON(optsJSON string) string {
	if optsJSON == "" || optsJSON == "{}" || optsJSON == "null" {
		return ""
	}
	var opts map[string]interface{}
	if err := json.Unmarshal([]byte(optsJSON), &opts); err != nil {
		return ""
	}
	return formatArgsForDisplay(opts)
}