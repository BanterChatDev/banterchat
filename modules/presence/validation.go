package presence
func isValidManual(status string) bool {
    return status == "online" || status == "idle" || status == "dnd" || status == "invisible"
}