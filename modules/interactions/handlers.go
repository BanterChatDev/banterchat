package interactions

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"ror/modules/bots"
	"ror/modules/logger"
)

type API struct {
	svc *Service
}

func NewAPI(svc *Service) *API {
	return &API{svc: svc}
}

func (a *API) Respond(c echo.Context) error {
	interactionID := c.Param("id")
	token := c.Request().Header.Get("X-Interaction-Token")
	botUserID, _ := c.Get("userID").(string)
	if interactionID == "" || token == "" || botUserID == "" {
		return c.JSON(http.StatusBadRequest, bots.ErrorResponse{Code: bots.ErrCodeInvalidRequest, Message: "missing id or token"})
	}
	var req RespondReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, bots.ErrorResponse{Code: bots.ErrCodeInvalidRequest, Message: "invalid body"})
	}
	msgID, err := a.svc.Respond(botUserID, interactionID, token, req)
	if err != nil {
		return mapError(c, err)
	}
	if msgID == "" {
		return c.NoContent(http.StatusNoContent)
	}
	return c.JSON(http.StatusCreated, echo.Map{"message_id": msgID})
}

func (a *API) HandleSlashCommand(userID string, raw json.RawMessage) {
	var req InvokeReq
	if err := json.Unmarshal(raw, &req); err != nil {
		logger.Warn("interactions.handler slash_command bad json", "user", userID, "error", err)
		return
	}
	_, err := a.svc.Invoke(userID, req)
	if err != nil {
		a.svc.notifyInteractionError(userID, "slash", req.Command, err)
	}
}

func mapError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, ErrCommandNotFound), errors.Is(err, ErrInteractionGone):
		return c.JSON(http.StatusNotFound, bots.ErrorResponse{Code: bots.ErrCodeUnknownApp, Message: err.Error()})
	case errors.Is(err, ErrNotAllowed):
		return c.JSON(http.StatusForbidden, bots.ErrorResponse{Code: bots.ErrCodeForbidden, Message: "missing permissions"})
	case errors.Is(err, ErrAlreadyResponded), errors.Is(err, ErrInvalidRequest):
		return c.JSON(http.StatusBadRequest, bots.ErrorResponse{Code: bots.ErrCodeInvalidRequest, Message: err.Error()})
	}
	if bots.WriteMessageError(c, err) {
		return nil
	}
	return c.JSON(http.StatusInternalServerError, bots.ErrorResponse{Code: bots.ErrCodeServerError, Message: "server error"})
}