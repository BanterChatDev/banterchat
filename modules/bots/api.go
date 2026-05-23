package bots

import (
	"github.com/labstack/echo/v4"

	"ror/modules/avatar"
	"ror/modules/banner"
	"ror/modules/messages"
	"ror/modules/reactions"
	"ror/modules/typing"
	"ror/modules/webhooks"
)

type API struct {
	svc      *Service
	messages *messages.Service
	reacts   *reactions.Service
	typings  *typing.Service
	avatar   *avatar.Service
	banner   *banner.Service
	webhooks *webhooks.Service
}

func NewAPI(svc *Service, m *messages.Service, r *reactions.Service, t *typing.Service, av *avatar.Service, bn *banner.Service, wh *webhooks.Service) *API {
	return &API{svc: svc, messages: m, reacts: r, typings: t, avatar: av, banner: bn, webhooks: wh}
}

func (a *API) Me(c echo.Context) error {
	userID, _ := c.Get("userID").(string)
	appID, _ := c.Get("appID").(string)
	resp, err := a.svc.users.BuildUserResponse(userID, userID)
	if err != nil {
		return c.JSON(500, ErrorResponse{Code: ErrCodeServerError, Message: "server error"})
	}
	resp["application_id"] = appID
	return c.JSON(200, resp)
}

func mapActionError(c echo.Context, err error) error {
	if WriteMessageError(c, err) {
		return nil
	}
	return c.JSON(500, ErrorResponse{Code: ErrCodeServerError, Message: "server error"})
}