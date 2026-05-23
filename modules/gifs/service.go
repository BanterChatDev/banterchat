package gifs

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/db"
	"ror/modules/id"
	"ror/modules/websocket"
)

type Service struct {
	db  *db.DB
	cfg Config
	hub *websocket.Hub
	hc  *http.Client
}

func NewService(database *db.DB, cfg Config, hub *websocket.Hub) *Service {
	return &Service{
		db:  database,
		cfg: cfg,
		hub: hub,
		hc:  &http.Client{Timeout: 6 * time.Second},
	}
}

type tenorMedia struct {
	URL  string `json:"url"`
	Dims [2]int `json:"dims"`
}

type tenorResult struct {
	ID           string                `json:"id"`
	ContentDesc  string                `json:"content_description"`
	URL          string                `json:"url"`
	MediaFormats map[string]tenorMedia `json:"media_formats"`
}

type tenorResp struct {
	Results []tenorResult `json:"results"`
	Next    string        `json:"next"`
}

type GifJSON struct {
	ID          string `json:"id"`
	URL         string `json:"url"`
	PreviewURL  string `json:"preview_url"`
	Width       int    `json:"width"`
	Height      int    `json:"height"`
	Description string `json:"description"`
}

func (s *Service) providerRequest(endpoint string, params url.Values) (*tenorResp, error) {
	if s.cfg.APIKey == "" || s.cfg.APIKey == "REPLACE_WITH_KLIPY_KEY" {
		return nil, errors.New("gif provider api key not configured")
	}
	params.Set("key", s.cfg.APIKey)
	params.Set("client_key", s.cfg.Client)
	params.Set("media_filter", "tinygif,gif")
	if s.cfg.ContentFilter != "" {
		params.Set("contentfilter", s.cfg.ContentFilter)
	}
	full := s.cfg.BaseURL + "/" + strings.TrimLeft(endpoint, "/") + "?" + params.Encode()
	req, _ := http.NewRequest("GET", full, nil)
	resp, err := s.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, errors.New(s.cfg.Provider + ": " + resp.Status + " " + string(body))
	}
	var out tenorResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Service) toJSON(r tenorResult) GifJSON {
	full := r.MediaFormats["gif"]
	tiny := r.MediaFormats["tinygif"]
	preview := tiny.URL
	if preview == "" {
		preview = full.URL
	}
	return GifJSON{
		ID:          r.ID,
		URL:         full.URL,
		PreviewURL:  preview,
		Width:       full.Dims[0],
		Height:      full.Dims[1],
		Description: r.ContentDesc,
	}
}

func (s *Service) Search(c echo.Context) error {
	q := strings.TrimSpace(c.QueryParam("q"))
	if q == "" {
		return c.JSON(400, echo.Map{"error": "q required"})
	}
	if len(q) > 64 {
		q = q[:64]
	}
	params := url.Values{}
	params.Set("q", q)
	params.Set("limit", itoa(s.cfg.SearchLimit))
	if pos := c.QueryParam("pos"); pos != "" && len(pos) < 64 {
		params.Set("pos", pos)
	}
	resp, err := s.providerRequest("search", params)
	if err != nil {
		return c.JSON(502, echo.Map{"error": "gif provider unavailable", "detail": err.Error()})
	}
	out := make([]GifJSON, len(resp.Results))
	for i, r := range resp.Results {
		out[i] = s.toJSON(r)
	}
	return c.JSON(200, echo.Map{"results": out, "next": resp.Next})
}

func (s *Service) Trending(c echo.Context) error {
	params := url.Values{}
	params.Set("limit", itoa(s.cfg.TrendingLimit))
	if pos := c.QueryParam("pos"); pos != "" && len(pos) < 64 {
		params.Set("pos", pos)
	}
	resp, err := s.providerRequest("featured", params)
	if err != nil {
		return c.JSON(502, echo.Map{"error": "gif provider unavailable", "detail": err.Error()})
	}
	out := make([]GifJSON, len(resp.Results))
	for i, r := range resp.Results {
		out[i] = s.toJSON(r)
	}
	return c.JSON(200, echo.Map{"results": out, "next": resp.Next})
}

func (s *Service) ListTabs(c echo.Context) error {
	userID := c.Get("userID").(string)
	tabs := s.db.ListGifTabs(userID)
	if tabs == nil {
		tabs = []db.GifTabRow{}
	}
	return c.JSON(200, tabs)
}

func (s *Service) CreateTab(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "bad request"})
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.JSON(400, echo.Map{"error": "name required"})
	}
	if len(req.Name) > s.cfg.MaxTabName {
		req.Name = req.Name[:s.cfg.MaxTabName]
	}
	if s.db.CountGifTabs(userID) >= s.cfg.MaxTabs {
		return c.JSON(400, echo.Map{"error": "max tabs reached"})
	}
	tabID := id.Generate()
	pos := s.db.CountGifTabs(userID)
	if err := s.db.CreateGifTab(tabID, userID, req.Name, pos); err != nil {
		return c.JSON(500, echo.Map{"error": "create failed"})
	}
	row := db.GifTabRow{ID: tabID, Name: req.Name, Position: pos, CreatedAt: time.Now()}
	s.emitTabCreate(userID, row)
	return c.JSON(201, row)
}

func (s *Service) RenameTab(c echo.Context) error {
	userID := c.Get("userID").(string)
	tabID := c.Param("tabId")
	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "bad request"})
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.JSON(400, echo.Map{"error": "name required"})
	}
	if len(req.Name) > s.cfg.MaxTabName {
		req.Name = req.Name[:s.cfg.MaxTabName]
	}
	if !s.db.IsGifTabOwner(tabID, userID) {
		return c.JSON(404, echo.Map{"error": "tab not found"})
	}
	if err := s.db.RenameGifTab(tabID, userID, req.Name); err != nil {
		return c.JSON(500, echo.Map{"error": "rename failed"})
	}
	s.emitTabRename(userID, tabID, req.Name)
	return c.JSON(200, echo.Map{"id": tabID, "name": req.Name})
}

func (s *Service) DeleteTab(c echo.Context) error {
	userID := c.Get("userID").(string)
	tabID := c.Param("tabId")
	if !s.db.IsGifTabOwner(tabID, userID) {
		return c.JSON(404, echo.Map{"error": "tab not found"})
	}
	if err := s.db.DeleteGifTab(tabID, userID); err != nil {
		return c.JSON(500, echo.Map{"error": "delete failed"})
	}
	s.emitTabDelete(userID, tabID)
	return c.JSON(200, echo.Map{"message": "deleted"})
}

func (s *Service) ListFavorites(c echo.Context) error {
	userID := c.Get("userID").(string)
	tabID := c.QueryParam("tab_id")
	if tabID != "" && tabID != "default" && !s.db.IsGifTabOwner(tabID, userID) {
		return c.JSON(404, echo.Map{"error": "tab not found"})
	}
	if tabID == "default" {
		tabID = ""
	}
	favs := s.db.ListGifFavorites(userID, tabID)
	if favs == nil {
		favs = []db.GifFavoriteRow{}
	}
	return c.JSON(200, favs)
}

func (s *Service) AddFavorite(c echo.Context) error {
	userID := c.Get("userID").(string)
	var req struct {
		TabID       string `json:"tab_id"`
		TenorID     string `json:"tenor_id"`
		URL         string `json:"url"`
		PreviewURL  string `json:"preview_url"`
		Width       int    `json:"width"`
		Height      int    `json:"height"`
		Description string `json:"description"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "bad request"})
	}
	if req.URL == "" || req.TenorID == "" {
		return c.JSON(400, echo.Map{"error": "url and tenor_id required"})
	}
	if req.TabID != "" && req.TabID != "default" && !s.db.IsGifTabOwner(req.TabID, userID) {
		return c.JSON(404, echo.Map{"error": "tab not found"})
	}
	if req.TabID == "default" {
		req.TabID = ""
	}
	if existing, err := s.db.FindGifFavoriteByTenor(userID, req.TenorID); err == nil && existing != "" {
		return c.JSON(200, echo.Map{"id": existing, "existing": true})
	}
	if s.db.CountGifFavorites(userID) >= s.cfg.MaxFavorites {
		return c.JSON(400, echo.Map{"error": "max favorites reached"})
	}
	favID := id.Generate()
	if err := s.db.AddGifFavorite(favID, userID, req.TabID, req.TenorID, req.URL, req.PreviewURL, req.Width, req.Height, req.Description); err != nil {
		return c.JSON(500, echo.Map{"error": "save failed"})
	}
	s.emitFavoriteAdd(userID, favID, req.TabID, req.TenorID, req.URL)
	return c.JSON(201, echo.Map{"id": favID})
}

func (s *Service) DeleteFavorite(c echo.Context) error {
	userID := c.Get("userID").(string)
	favID := c.Param("favId")
	tenorID, _ := s.db.GetGifFavoriteTenor(favID, userID)
	if err := s.db.DeleteGifFavorite(favID, userID); err != nil {
		return c.JSON(500, echo.Map{"error": "delete failed"})
	}
	s.emitFavoriteDelete(userID, favID, tenorID)
	return c.JSON(200, echo.Map{"message": "deleted"})
}

func (s *Service) MoveFavorite(c echo.Context) error {
	userID := c.Get("userID").(string)
	favID := c.Param("favId")
	var req struct {
		TabID string `json:"tab_id"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, echo.Map{"error": "bad request"})
	}
	if req.TabID != "" && req.TabID != "default" && !s.db.IsGifTabOwner(req.TabID, userID) {
		return c.JSON(404, echo.Map{"error": "tab not found"})
	}
	if req.TabID == "default" {
		req.TabID = ""
	}
	if err := s.db.MoveGifFavorite(favID, userID, req.TabID); err != nil {
		return c.JSON(500, echo.Map{"error": "move failed"})
	}
	s.emitFavoriteMove(userID, favID, req.TabID)
	return c.JSON(200, echo.Map{"message": "moved"})
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}