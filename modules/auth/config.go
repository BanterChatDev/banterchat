package auth

import "os"

type Config struct {
	MasterKey             string
	MinUsername           int
	MaxUsername           int
	MinPassword           int
	MaxPassword           int
	MaxRegistrationsPerIP int
	SiteAdmins            []string
}

func DefaultConfig() Config {
	return Config{
		MasterKey:             os.Getenv("MASTER_KEY"),
		MinUsername:           3,
		MaxUsername:           20,
		MinPassword:           8,
		MaxPassword:           72,
		MaxRegistrationsPerIP: 30,
		SiteAdmins:            []string{},
	}
}