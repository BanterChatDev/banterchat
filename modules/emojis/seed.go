package emojis

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"

	"ror/modules/emojis/defaults"
	"ror/modules/fileutil"
	"ror/modules/logger"
)

var extToMime = map[string]string{
	".webp": fileutil.MimeWebP,
	".png":  fileutil.MimePNG,
	".gif":  fileutil.MimeGIF,
	".jpg":  fileutil.MimeJPEG,
	".jpeg": fileutil.MimeJPEG,
}

func (s *Service) defaultPath(name string) string {
	def, ok := defaults.Lookup(name)
	if !ok {
		return ""
	}
	return filepath.Join(s.cfg.StoragePath, s.cfg.DefaultSubdir, def.File)
}

func defaultEmojiID(name string) string {
	h := sha256.Sum256([]byte("default:" + name))
	return hex.EncodeToString(h[:16])
}

func categoryIconEmojiName(category string) string {
	for _, ic := range defaults.CategoryIcons() {
		if ic.Category == category {
			return ic.EmojiName
		}
	}
	return ""
}

func (s *Service) SeedDefaults() {
	dir := filepath.Join(s.cfg.StoragePath, s.cfg.DefaultSubdir)
	all := defaults.All()
	keepIDs := make([]string, 0, len(all))
	for _, def := range all {
		fullPath := filepath.Join(dir, def.File)
		stat, err := os.Stat(fullPath)
		if err != nil {
			logger.Warn("default emoji file missing", "name", def.Name, "file", def.File)
			continue
		}
		ext := strings.ToLower(filepath.Ext(def.File))
		mime, ok := extToMime[ext]
		if !ok {
			logger.Warn("default emoji unsupported extension", "name", def.Name, "file", def.File)
			continue
		}
		if verr := ValidateName(def.Name, s.cfg); verr != nil {
			logger.Warn("default emoji invalid name", "name", def.Name, "error", verr)
			continue
		}
		data, rerr := os.ReadFile(fullPath)
		if rerr != nil {
			logger.Warn("default emoji read failed", "name", def.Name, "error", rerr)
			continue
		}
		_, _, animated, derr := decodeDimensions(data, mime)
		if derr != nil {
			logger.Warn("default emoji decode failed", "name", def.Name, "error", derr)
			continue
		}
		emojiID := defaultEmojiID(def.Name)
		if err := s.db.UpsertDefaultEmoji(emojiID, def.Name, mime, stat.Size(), animated, def.Category); err != nil {
			logger.Error("default emoji upsert failed", "name", def.Name, "error", err)
			continue
		}
		keepIDs = append(keepIDs, emojiID)
	}
	if n, err := s.db.DeleteDefaultEmojisExcept(keepIDs); err != nil {
		logger.Error("default emoji prune failed", "error", err)
	} else if n > 0 {
		logger.Info("default emoji prune", "removed", n)
	}
}