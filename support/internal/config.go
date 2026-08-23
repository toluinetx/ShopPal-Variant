package internal

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	NotificationsURL     string
	AllowedOrigins       []string
	ServiceName          string
	Environment          string
}

func LoadConfig() (Config, error) {
	cfg := Config{
		Port:             envOr("PORT", "8081"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		NotificationsURL: envOr("NOTIFICATIONS_URL", ""),
		ServiceName:      envOr("SERVICE_NAME", "support"),
		Environment:      envOr("ENV", "development"),
	}

	origins := envOr("ALLOWED_ORIGINS", "*")
	cfg.AllowedOrigins = splitCSV(origins)

	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("DATABASE_URL is required")
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
