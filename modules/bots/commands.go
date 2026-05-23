package bots

import (
	"encoding/json"

	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/logger"
)

type CommandSpec struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Options     json.RawMessage `json:"options,omitempty"`
}

type ResolvedCommand struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	BotID       string          `json:"bot_user_id"`
	BotName     string          `json:"bot_name"`
	Options     json.RawMessage `json:"options,omitempty"`
}

func rowToCommandSpec(r db.BotCommandRow) CommandSpec {
	spec := CommandSpec{Name: r.Name, Description: r.Description}
	if r.ArgsJSON != "" && r.ArgsJSON != "[]" {
		spec.Options = json.RawMessage(r.ArgsJSON)
	}
	return spec
}

func (s *Service) SetGlobalCommands(botUserID string, commands []CommandSpec) error {
	if err := s.db.DeleteBotCommandsByBotGuild(botUserID, ""); err != nil {
		logger.Error("bots: delete commands failed", "error", err, "bot_user_id", botUserID)
		return err
	}
	for _, c := range commands {
		if c.Name == "" {
			continue
		}
		argsJSON := "[]"
		if len(c.Options) > 0 {
			argsJSON = string(c.Options)
		}
		if err := s.db.InsertBotCommand(id.Generate(), botUserID, "", c.Name, c.Description, argsJSON, 0); err != nil {
			logger.Error("bots: insert command failed", "error", err, "bot_user_id", botUserID, "command", c.Name)
			return err
		}
	}
	if guildIDs, err := s.db.ListGuildIDsForUser(botUserID); err == nil {
		for _, gid := range guildIDs {
			s.emitCommandsUpdated(gid, botUserID)
		}
	}
	return nil
}

func (s *Service) ListGlobalCommands(botUserID string) ([]CommandSpec, error) {
	rows, err := s.db.ListGlobalBotCommandsByBot(botUserID)
	if err != nil {
		return nil, err
	}
	out := make([]CommandSpec, 0, len(rows))
	for _, r := range rows {
		out = append(out, rowToCommandSpec(r))
	}
	return out, nil
}

func (s *Service) ListGuildCommands(guildID string) ([]ResolvedCommand, error) {
	rows, err := s.db.ListGuildResolvedCommands(guildID)
	if err != nil {
		return nil, err
	}
	out := make([]ResolvedCommand, 0, len(rows))
	nameCache := make(map[string]string)
	for _, r := range rows {
		botName, cached := nameCache[r.BotUserID]
		if !cached {
			botName = s.users.DecryptUsernameByID(r.BotUserID)
			nameCache[r.BotUserID] = botName
		}
		entry := ResolvedCommand{
			Name:        r.Name,
			Description: r.Description,
			BotID:       r.BotUserID,
			BotName:     botName,
		}
		if r.ArgsJSON != "" && r.ArgsJSON != "[]" {
			entry.Options = json.RawMessage(r.ArgsJSON)
		}
		out = append(out, entry)
	}
	return out, nil
}