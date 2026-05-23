package auth

import (
	"strconv"
	"strings"
)

var botPatterns = []string{
	"curl/", "wget/", "python-requests", "python/",
	"go-http-client", "httpie", "node-fetch", "axios/",
	"java/", "okhttp", "libwww", "lwp-", "scrapy",
	"mechanize", "guzzle", "requests/", "pycurl",
}

func isBotUA(ua string) bool {
	if ua == "" {
		return true
	}
	lower := strings.ToLower(ua)
	for _, p := range botPatterns {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}

func checkBrowserProof(proof string) bool {
	if proof == "" {
		return false
	}
	parts := strings.SplitN(proof, "x", 2)
	if len(parts) != 2 {
		return false
	}
	w, err1 := strconv.Atoi(parts[0])
	h, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return false
	}
	return w >= 100 && w <= 9999 && h >= 100 && h <= 9999
}