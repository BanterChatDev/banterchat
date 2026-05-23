package accessibilityprefs

import (
	"github.com/labstack/echo/v4"
)

const (
	textScaleMin = 1.0
	textScaleMax = 1.5
)

func (s *Service) GetHandler(c echo.Context) error {
	userID := c.Get("userID").(string)
	return c.JSON(200, s.Get(userID))
}

func (s *Service) UpdateHandler(c echo.Context) error {
	userID := c.Get("userID").(string)
	var incoming map[string]interface{}
	if err := c.Bind(&incoming); err != nil {
		return c.JSON(400, echo.Map{"error": "invalid request"})
	}
	existing := s.Get(userID)
	if v, ok := incoming["highContrast"]; ok {
		if b, bok := v.(bool); bok {
			existing["highContrast"] = b
		}
	}
	if v, ok := incoming["invertColors"]; ok {
		if b, bok := v.(bool); bok {
			existing["invertColors"] = b
		}
	}
	if v, ok := incoming["largerTextScale"]; ok {
		if f, fok := v.(float64); fok {
			if f < textScaleMin {
				f = textScaleMin
			}
			if f > textScaleMax {
				f = textScaleMax
			}
			existing["largerTextScale"] = f
		}
	}
	if err := s.Set(userID, existing); err != nil {
		return c.JSON(500, echo.Map{"error": "server error"})
	}
	s.emitChanged(userID, existing)
	return c.JSON(200, existing)
}