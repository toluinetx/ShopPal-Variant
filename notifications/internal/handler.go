package internal

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

type Handler struct {
	store   *EventStore
	log     *slog.Logger
	started time.Time
}

func NewHandler(store *EventStore, log *slog.Logger) *Handler {
	return &Handler{store: store, log: log, started: time.Now()}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("POST /notify", h.notify)
	mux.HandleFunc("GET /events", h.list)
	return mux
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":       "ok",
		"service":      "notifications",
		"event_count":  h.store.Count(),
		"uptime_sec":   int(time.Since(h.started).Seconds()),
	})
}

func (h *Handler) notify(w http.ResponseWriter, r *http.Request) {
	var e Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	if e.Type == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "type required"})
		return
	}
	h.store.Add(e)
	h.log.Info("event received", "type", e.Type)
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	writeJSON(w, http.StatusOK, h.store.List(limit))
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
