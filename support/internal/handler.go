package internal

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Handler struct {
	store    *Store
	notifier *Notifier
	log      *slog.Logger
	started  time.Time
}

func NewHandler(store *Store, notifier *Notifier, log *slog.Logger) *Handler {
	return &Handler{store: store, notifier: notifier, log: log, started: time.Now()}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /readyz", h.ready)
	mux.HandleFunc("GET /categories", h.listCategories)
	mux.HandleFunc("POST /tickets", h.createTicket)
	mux.HandleFunc("GET /tickets", h.listTickets)
	mux.HandleFunc("GET /tickets/{id}", h.getTicket)
	mux.HandleFunc("POST /tickets/{id}/messages", h.addMessage)
	mux.HandleFunc("PATCH /tickets/{id}/status", h.updateStatus)
	return mux
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":     "ok",
		"service":    "support",
		"uptime_sec": int(time.Since(h.started).Seconds()),
	})
}

func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	if err := h.store.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"status": "not-ready", "err": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready"})
}

func (h *Handler) listCategories(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"categories": Categories})
}

func (h *Handler) createTicket(w http.ResponseWriter, r *http.Request) {
	var req CreateTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if strings.TrimSpace(req.Subject) == "" || strings.TrimSpace(req.Body) == "" {
		writeError(w, http.StatusBadRequest, "subject and body are required")
		return
	}
	if strings.TrimSpace(req.Email) == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	if req.Category == "" {
		req.Category = "other"
	}
	if req.Priority != "" && !req.Priority.Valid() {
		writeError(w, http.StatusBadRequest, "invalid priority")
		return
	}
	ticket, err := h.store.CreateTicket(r.Context(), req)
	if err != nil {
		h.log.Error("create ticket failed", "err", err)
		writeError(w, http.StatusInternalServerError, "could not create ticket")
		return
	}
	go h.notifier.Emit(r.Context(), "ticket.created", ticket)
	writeJSON(w, http.StatusCreated, ticket)
}

func (h *Handler) listTickets(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	userID := q.Get("user_id")
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	tickets, err := h.store.ListTickets(r.Context(), userID, limit, offset)
	if err != nil {
		h.log.Error("list tickets failed", "err", err)
		writeError(w, http.StatusInternalServerError, "could not list tickets")
		return
	}
	writeJSON(w, http.StatusOK, tickets)
}

func (h *Handler) getTicket(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	ticket, err := h.store.GetTicket(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "ticket not found")
			return
		}
		h.log.Error("get ticket failed", "err", err)
		writeError(w, http.StatusInternalServerError, "could not get ticket")
		return
	}
	writeJSON(w, http.StatusOK, ticket)
}

func (h *Handler) addMessage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if strings.TrimSpace(req.Body) == "" {
		writeError(w, http.StatusBadRequest, "body is required")
		return
	}
	if req.AuthorRole == "" {
		req.AuthorRole = "customer"
	}
	msg, err := h.store.AddMessage(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "ticket not found")
			return
		}
		h.log.Error("add message failed", "err", err)
		writeError(w, http.StatusInternalServerError, "could not add message")
		return
	}
	go h.notifier.Emit(r.Context(), "ticket.message_added", msg)
	writeJSON(w, http.StatusCreated, msg)
}

func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if !req.Status.Valid() {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}
	ticket, err := h.store.UpdateStatus(r.Context(), id, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "ticket not found")
			return
		}
		h.log.Error("update status failed", "err", err)
		writeError(w, http.StatusInternalServerError, "could not update status")
		return
	}
	go h.notifier.Emit(r.Context(), "ticket.status_changed", ticket)
	writeJSON(w, http.StatusOK, ticket)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
