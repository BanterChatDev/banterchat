package proxy

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"ror/modules/fileutil"
)

type Service struct {
	cfg    Config
	client *http.Client
}

func NewService(cfg Config) *Service {
	transport := &http.Transport{
		DialContext:           blockPrivateDialer(),
		MaxIdleConns:          50,
		IdleConnTimeout:       30 * time.Second,
		ResponseHeaderTimeout: time.Duration(cfg.TimeoutSecs) * time.Second,
	}
	return &Service{
		cfg: cfg,
		client: &http.Client{
			Transport: transport,
			Timeout:   time.Duration(cfg.TimeoutSecs) * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return http.ErrUseLastResponse
				}
				if isPrivateHost(req.URL.Hostname()) {
					return http.ErrUseLastResponse
				}
				return nil
			},
		},
	}
}

func (s *Service) Handle(c echo.Context) error {
	rawURL := c.QueryParam("url")
	if rawURL == "" {
		return c.JSON(400, echo.Map{"error": "missing url parameter"})
	}
	resp, _, err := s.fetchRemote(c, rawURL, "image/*,*/*;q=0.8")
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	sniff := make([]byte, 512)
	n, _ := io.ReadFull(resp.Body, sniff)
	sniff = sniff[:n]
	detected := fileutil.Detect(sniff)

	// Go's http.DetectContentType only recognizes a handful of image
	// formats (PNG, JPEG, GIF, WebP, BMP). It misses SVG (labeled as
	// text/xml), ICO (no magic), AVIF, and others. When the sniffer
	// doesn't see an image, trust the remote Content-Type if the server
	// claims it's an image type we explicitly allow.
	ct := detected
	if !fileutil.IsImage(detected) {
		remote := fileutil.Normalize(resp.Header.Get("Content-Type"))
		if fileutil.IsAllowedProxy(remote) {
			ct = remote
		}
	}

	if !fileutil.IsAllowedProxy(ct) {
		return c.JSON(403, echo.Map{"error": "content type not allowed"})
	}

	c.Response().Header().Set("Content-Type", ct)
	c.Response().Header().Set("Cache-Control", "public, max-age=86400, immutable")
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")
	c.Response().WriteHeader(200)
	remaining := s.cfg.MaxSize - int64(len(sniff))
	if remaining < 0 {
		remaining = 0
	}
	io.Copy(c.Response().Writer, io.MultiReader(bytes.NewReader(sniff), io.LimitReader(resp.Body, remaining)))
	return nil
}