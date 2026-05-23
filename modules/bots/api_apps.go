package bots

import (
	"github.com/labstack/echo/v4"
)

func (a *API) CreateApp(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return badReq(c)
	}
	app, token, err := a.svc.CreateApp(userID, req.Name)
	if err != nil {
		return writeAppErr(c, err)
	}
	return c.JSON(201, echo.Map{"application": app, "token": token})
}

func (a *API) ListApps(c echo.Context) error {
	userID := c.Get("userID").(string)
	apps, err := a.svc.ListApps(userID)
	if err != nil {
		return c.JSON(500, ErrorResponse{Code: ErrCodeServerError, Message: "server error"})
	}
	if apps == nil {
		apps = []App{}
	}
	return c.JSON(200, echo.Map{"applications": apps})
}

func (a *API) GetApp(c echo.Context) error {
	userID := c.Get("userID").(string)
	appID := c.Param("id")
	app, err := a.svc.GetApp(appID, userID)
	if err != nil {
		return writeAppErr(c, err)
	}
	return c.JSON(200, app)
}

func (a *API) UpdateApp(c echo.Context) error {
	userID := c.Get("userID").(string)
	appID := c.Param("id")
	var req struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		DisplayName *string `json:"display_name,omitempty"`
		Bio         *string `json:"bio,omitempty"`
	}
	if err := c.Bind(&req); err != nil {
		return badReq(c)
	}
	app, err := a.svc.UpdateApp(appID, userID, UpdateAppReq{
		Name:        req.Name,
		Description: req.Description,
		DisplayName: req.DisplayName,
		Bio:         req.Bio,
	})
	if err != nil {
		return writeAppErr(c, err)
	}
	return c.JSON(200, app)
}

func (a *API) DeleteApp(c echo.Context) error {
	userID := c.Get("userID").(string)
	appID := c.Param("id")
	if err := a.svc.DeleteApp(appID, userID); err != nil {
		return writeAppErr(c, err)
	}
	return c.NoContent(204)
}

func (a *API) RotateToken(c echo.Context) error {
	userID := c.Get("userID").(string)
	appID := c.Param("id")
	token, err := a.svc.RotateToken(appID, userID)
	if err != nil {
		return writeAppErr(c, err)
	}
	return c.JSON(200, echo.Map{"token": token})
}