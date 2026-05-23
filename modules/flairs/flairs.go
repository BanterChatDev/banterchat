package flairs

var validIDs = map[string]bool{
	"none": true, "gem": true, "thug": true, "retard": true,
}

func Valid(id string) bool {
	return validIDs[id]
}