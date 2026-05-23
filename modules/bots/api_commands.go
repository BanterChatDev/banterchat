package bots

import (
	"github.com/labstack/echo/v4"

	"ror/modules/permissions"
)

func (a *API) registerCommandsFor(c echo.Context, app App, body []CommandSpec) error {
	if err := a.svc.SetGlobalCommands(app.BotUserID, body); err != nil {
		return serverErr(c, "failed to register commands")
	}
	return c.JSON(200, echo.Map{"registered": len(body)})
}

func (a *API) listCommandsFor(c echo.Context, app App) error {
	cmds, err := a.svc.ListGlobalCommands(app.BotUserID)
	if err != nil {
		return serverErr(c, "failed to list commands")
	}
	return c.JSON(200, echo.Map{"commands": cmds})
}

func (a *API) RegisterCommands(c echo.Context) error {
	appID := c.Param("id")
	var body struct {
		Commands []CommandSpec `json:"commands"`
	}
	if err := c.Bind(&body); err != nil {
		return badReq(c)
	}
	app, err := a.svc.GetAppPublic(appID)
	if err != nil {
		return writeAppErr(c, ErrNotFound)
	}
	userID := c.Get("userID").(string)
	if app.OwnerID != userID {
		return writeAppErr(c, ErrNotOwner)
	}
	return a.registerCommandsFor(c, app, body.Commands)
}

func (a *API) ListCommands(c echo.Context) error {
	appID := c.Param("id")
	app, err := a.svc.GetAppPublic(appID)
	if err != nil {
		return writeAppErr(c, ErrNotFound)
	}
	return a.listCommandsFor(c, app)
}

func (a *API) RegisterCommandsSelf(c echo.Context) error {
	appID, _ := c.Get("appID").(string)
	var body struct {
		Commands []CommandSpec `json:"commands"`
	}
	if err := c.Bind(&body); err != nil {
		return badReq(c)
	}
	app, err := a.svc.GetAppPublic(appID)
	if err != nil {
		return writeAppErr(c, ErrNotFound)
	}
	return a.registerCommandsFor(c, app, body.Commands)
}

func (a *API) ListCommandsSelf(c echo.Context) error {
	appID, _ := c.Get("appID").(string)
	app, err := a.svc.GetAppPublic(appID)
	if err != nil {
		return writeAppErr(c, ErrNotFound)
	}
	return a.listCommandsFor(c, app)
}

func (a *API) ListGuildCommands(c echo.Context) error {
	guildID := c.Param("guildId")
	userID := c.Get("userID").(string)
	cmds, err := a.svc.ListGuildCommands(guildID)
	if err != nil {
		return serverErr(c, "failed to list commands")
	}
	perms := permissions.GetUserGuildPerms(a.svc.DB(), userID, guildID)
	return c.JSON(200, echo.Map{"commands": cmds, "caller_perms": perms})
}