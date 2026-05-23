package voicechat

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/webhook"
	"ror/modules/logger"
	"ror/modules/conf"
	"ror/modules/permissions"
)

type tokenRequest struct {
	ChannelID string `json:"channel_id"`
}

type tokenResponse struct {
	Token string `json:"token"`
	URL   string `json:"url"`
}

func (s *Service) HandleToken(c echo.Context) error {
	userID, ok := c.Get("userID").(string)
	if !ok || userID == "" {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthenticated"})
	}
	var req tokenRequest
	if err := c.Bind(&req); err != nil || req.ChannelID == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request"})
	}
	perms := permissions.ResolveChannelPerms(s.DB, userID, req.ChannelID)
	if !permissions.HasPerm(perms, permissions.PermViewChannels) {
		return c.JSON(http.StatusForbidden, echo.Map{"error": "no permission"})
	}
	username := userID
	if s.DecryptUsernameByID != nil {
		if name := s.DecryptUsernameByID(userID); name != "" {
			username = name
		}
	}
	token, err := s.MintToken(userID, req.ChannelID, username)
	if err != nil {
		logger.Error("voice: mint token failed", "user", userID, "channel", req.ChannelID, "error", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "token mint failed"})
	}
	return c.JSON(http.StatusOK, tokenResponse{Token: token, URL: conf.LiveKitURL})
}

func (s *Service) HandleGetStates(c echo.Context) error {
	return c.JSON(http.StatusOK, s.snapshotAll())
}

func (s *Service) HandleWebhook(c echo.Context) error {
	provider := auth.NewSimpleKeyProvider(conf.LiveKitAPIKey, conf.LiveKitAPISecret)
	event, err := webhook.ReceiveWebhookEvent(c.Request(), provider)
	if err != nil {
		logger.Error("voice: webhook verify failed", "error", err)
		return c.NoContent(http.StatusUnauthorized)
	}
	switch event.GetEvent() {
	case webhook.EventParticipantJoined:
		if event.Room != nil && event.Participant != nil {
			s.onJoin(event.Room.Name, event.Participant.Identity)
		}
	case webhook.EventParticipantLeft:
		if event.Room != nil && event.Participant != nil {
			s.onLeave(event.Room.Name, event.Participant.Identity)
		}
	case webhook.EventRoomFinished:
		if event.Room != nil {
			s.clearChannel(event.Room.Name)
		}
	}
	return c.NoContent(http.StatusOK)
}