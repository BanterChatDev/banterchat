package presence

import (
    "strings"
    "github.com/labstack/echo/v4"
)

type setStatusReq struct {
    Status string `json:"status"`
}

func (s *Service) SetStatusHandler(c echo.Context) error {
    userID := c.Get("userID").(string)
    var req setStatusReq
    if err := c.Bind(&req); err != nil {
        return c.JSON(400, echo.Map{"error": "invalid request"})
    }
    if err := s.SetManual(userID, strings.TrimSpace(req.Status)); err != nil {
        return c.JSON(400, echo.Map{"error": err.Error()})
    }
    return c.JSON(200, echo.Map{"status": req.Status})
}

func (s *Service) GetMyStatusHandler(c echo.Context) error {
    userID := c.Get("userID").(string)
    manual := s.GetManual(userID)
    if manual == "" {
        manual = "online"
    }
    return c.JSON(200, echo.Map{"presence_status": manual})
}