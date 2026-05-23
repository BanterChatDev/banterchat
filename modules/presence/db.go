package presence

import (
    "sync"
    "time"

    "ror/modules/db"
)

type manualEntry struct {
    status  string
    expires time.Time
}

var (
    manualCache sync.Map
    manualTTL   = 30 * time.Second
)

func getManual(database *db.DB, userID string) string {
    now := time.Now()
    if cached, ok := manualCache.Load(userID); ok {
        if e, ok := cached.(manualEntry); ok && now.Before(e.expires) {
            return e.status
        }
    }
    status := database.GetUserPresenceStatus(userID)
    manualCache.Store(userID, manualEntry{status: status, expires: now.Add(manualTTL)})
    return status
}

func setManual(database *db.DB, userID, status string) error {
    err := database.UpdateUserPresenceStatus(userID, status)
    if err == nil {
        manualCache.Store(userID, manualEntry{status: status, expires: time.Now().Add(manualTTL)})
    }
    return err
}

func ResolveStatus(database *db.DB, userID string, connectedOnline bool) string {
    if !connectedOnline {
        return "offline"
    }
    if database == nil {
        return "online"
    }
    switch getManual(database, userID) {
    case "invisible":
        return "offline"
    case "dnd":
        return "dnd"
    default:
        return "online"
    }
}