package internal

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

type Notifier struct {
	url    string
	client *http.Client
	log    *slog.Logger
}

func NewNotifier(url string, log *slog.Logger) *Notifier {
	return &Notifier{
		url: url,
		client: &http.Client{
			Timeout: 3 * time.Second,
		},
		log: log,
	}
}

type Event struct {
	Type      string      `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

// Emit fires an event to the notifications service. Failure is logged but not returned;
// notifications are best-effort so a downstream outage never breaks ticket operations.
func (n *Notifier) Emit(ctx context.Context, eventType string, payload interface{}) {
	if n == nil || n.url == "" {
		return
	}
	body, err := json.Marshal(Event{
		Type:      eventType,
		Timestamp: time.Now().UTC(),
		Payload:   payload,
	})
	if err != nil {
		n.log.Warn("notifier marshal failed", "err", err)
		return
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.url+"/notify", bytes.NewReader(body))
	if err != nil {
		n.log.Warn("notifier build request failed", "err", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := n.client.Do(req)
	if err != nil {
		n.log.Warn("notifier post failed", "err", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		n.log.Warn("notifier non-2xx", "status", resp.StatusCode)
	}
}
