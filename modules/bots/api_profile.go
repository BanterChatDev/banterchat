package bots

import "github.com/labstack/echo/v4"

func (a *API) resolveBot(c echo.Context) (string, error) {
	appID := c.Param("id")
	ownerID := c.Get("userID").(string)
	app, err := a.svc.GetApp(appID, ownerID)
	if err != nil {
		return "", writeAppErr(c, err)
	}
	return app.BotUserID, nil
}

func (a *API) UpdateBotAvatar(c echo.Context) error {
	botUserID, err := a.resolveBot(c)
	if err != nil {
		return err
	}
	return a.avatar.UploadFor(c, botUserID)
}

func (a *API) DeleteBotAvatar(c echo.Context) error {
	botUserID, err := a.resolveBot(c)
	if err != nil {
		return err
	}
	return a.avatar.DeleteFor(c, botUserID)
}

func (a *API) UpdateBotBanner(c echo.Context) error {
	botUserID, err := a.resolveBot(c)
	if err != nil {
		return err
	}
	return a.banner.UploadFor(c, botUserID)
}

func (a *API) DeleteBotBanner(c echo.Context) error {
	botUserID, err := a.resolveBot(c)
	if err != nil {
		return err
	}
	return a.banner.DeleteFor(c, botUserID)
}