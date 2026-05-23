package proxy

import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/labstack/echo/v4"
	"golang.org/x/net/html"
)

var errHandled = errors.New("handled")

func (s *Service) fetchRemote(c echo.Context, rawURL, accept string) (*http.Response, *url.URL, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		c.JSON(400, echo.Map{"error": "invalid url"})
		return nil, nil, errHandled
	}
	if isPrivateHost(parsed.Hostname()) {
		c.JSON(403, echo.Map{"error": "blocked"})
		return nil, nil, errHandled
	}
	req, err := http.NewRequestWithContext(c.Request().Context(), "GET", rawURL, nil)
	if err != nil {
		c.JSON(400, echo.Map{"error": "invalid request"})
		return nil, nil, errHandled
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; RorBot/1.0; +https://ror.app)")
	req.Header.Set("Accept", accept)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	resp, err := s.client.Do(req)
	if err != nil {
		c.JSON(502, echo.Map{"error": "fetch failed"})
		return nil, nil, errHandled
	}
	if resp.StatusCode >= 400 {
		resp.Body.Close()
		c.JSON(502, echo.Map{"error": "upstream error"})
		return nil, nil, errHandled
	}
	return resp, parsed, nil
}

func (s *Service) FetchMeta(c echo.Context) error {
	rawURL := c.QueryParam("url")
	if rawURL == "" {
		return c.JSON(400, echo.Map{"error": "missing url parameter"})
	}
	resp, parsed, err := s.fetchRemote(c, rawURL, "text/html,application/xhtml+xml")
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "text/html") && !strings.Contains(ct, "application/xhtml") {
		return c.JSON(400, echo.Map{"error": "not html"})
	}

	body := io.LimitReader(resp.Body, 256*1024)
	doc, err := html.Parse(body)
	if err != nil {
		return c.JSON(502, echo.Map{"error": "parse failed"})
	}

	meta := map[string]string{}
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "meta" {
			var prop, name, content string
			for _, a := range n.Attr {
				switch a.Key {
				case "property":
					prop = a.Val
				case "name":
					name = a.Val
				case "content":
					content = a.Val
				}
			}
			key := prop
			if key == "" {
				key = name
			}
			if key != "" && content != "" {
				meta[key] = content
			}
		}
		if n.Type == html.ElementNode && n.Data == "title" && n.FirstChild != nil {
			if _, ok := meta["title"]; !ok {
				meta["title"] = n.FirstChild.Data
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)

	pick := func(keys ...string) string {
		for _, k := range keys {
			if v, ok := meta[k]; ok && v != "" {
				return v
			}
		}
		return ""
	}

	image := pick("og:image", "og:image:secure_url", "twitter:image", "twitter:image:src")
	if image != "" && !strings.HasPrefix(image, "http") {
		if strings.HasPrefix(image, "//") {
			image = parsed.Scheme + ":" + image
		} else if strings.HasPrefix(image, "/") {
			image = parsed.Scheme + "://" + parsed.Host + image
		}
	}

	video := pick("og:video:secure_url", "og:video:url", "og:video", "twitter:player:stream")
	videoType := pick("og:video:type")
	videoWidth := pick("og:video:width", "twitter:player:width")
	videoHeight := pick("og:video:height", "twitter:player:height")

	player := pick("twitter:player")
	if player == "" {
		player = pick("og:video:secure_url", "og:video:url", "og:video")
		if player != "" && videoType != "" && !strings.Contains(videoType, "text/html") && !strings.Contains(videoType, "application/x-shockwave-flash") {
			player = ""
		}
	}

	ogType := pick("og:type")
	twitterCard := pick("twitter:card")
	themeColor := pick("theme-color")
	favicon := ""
	var oembedURL string
	var walkLinks func(*html.Node)
	walkLinks = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "link" {
			var rel, href, linkType string
			for _, a := range n.Attr {
				switch a.Key {
				case "rel":
					rel = a.Val
				case "href":
					href = a.Val
				case "type":
					linkType = a.Val
				}
			}
			if rel == "alternate" && strings.Contains(linkType, "oembed") && href != "" {
				oembedURL = href
			}
			if (rel == "icon" || rel == "shortcut icon") && href != "" && favicon == "" {
				if strings.HasPrefix(href, "http") {
					favicon = href
				} else if strings.HasPrefix(href, "//") {
					favicon = parsed.Scheme + ":" + href
				} else if strings.HasPrefix(href, "/") {
					favicon = parsed.Scheme + "://" + parsed.Host + href
				}
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walkLinks(child)
		}
	}
	walkLinks(doc)
	if favicon == "" {
		favicon = parsed.Scheme + "://" + parsed.Host + "/favicon.ico"
	}

	result := echo.Map{
		"url":          rawURL,
		"title":        pick("og:title", "twitter:title", "title"),
		"description":  pick("og:description", "twitter:description", "description"),
		"image":        image,
		"site_name":    pick("og:site_name"),
		"type":         ogType,
		"twitter_card": twitterCard,
		"video":        video,
		"video_type":   videoType,
		"video_width":  videoWidth,
		"video_height": videoHeight,
		"player":       player,
		"theme_color":  themeColor,
		"favicon":      favicon,
		"oembed_url":   oembedURL,
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=3600")
	return c.JSON(200, result)
}

func (s *Service) FetchOEmbed(c echo.Context) error {
	rawURL := c.QueryParam("url")
	if rawURL == "" {
		return c.JSON(400, echo.Map{"error": "missing url parameter"})
	}
	resp, _, err := s.fetchRemote(c, rawURL, "application/json")
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return c.JSON(502, echo.Map{"error": "read failed"})
	}
	c.Response().Header().Set("Cache-Control", "public, max-age=3600")
	return c.JSONBlob(200, data)
}