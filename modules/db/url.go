package db

import (
	"fmt"
	"net/url"

	"ror/modules/conf"
)

func BuildDSN() string {
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(conf.DBUser, conf.DBPassword),
		Host:   fmt.Sprintf("%s:%d", conf.DBHost, conf.DBPort),
		Path:   "/" + conf.DBName,
	}
	q := u.Query()
	if conf.DBSSLMode != "" {
		q.Set("sslmode", conf.DBSSLMode)
	}
	u.RawQuery = q.Encode()
	return u.String()
}