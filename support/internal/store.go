package internal

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(ctx context.Context, dsn string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *Store) Migrate(ctx context.Context, schema string) error {
	_, err := s.pool.Exec(ctx, schema)
	return err
}

func (s *Store) CreateTicket(ctx context.Context, req CreateTicketRequest) (*Ticket, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	ticketID := uuid.NewString()
	msgID := uuid.NewString()
	now := time.Now().UTC()

	if req.Priority == "" {
		req.Priority = PriorityNormal
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO support_tickets
		(id, user_id, email, subject, category, order_id, priority, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
	`, ticketID, req.UserID, req.Email, req.Subject, req.Category, req.OrderID, req.Priority, StatusOpen, now)
	if err != nil {
		return nil, fmt.Errorf("insert ticket: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO support_messages (id, ticket_id, author, author_role, body, created_at)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, msgID, ticketID, req.Email, "customer", req.Body, now)
	if err != nil {
		return nil, fmt.Errorf("insert message: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetTicket(ctx, ticketID)
}

func (s *Store) GetTicket(ctx context.Context, id string) (*Ticket, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, email, subject, category, order_id, priority, status, created_at, updated_at
		FROM support_tickets WHERE id = $1
	`, id)

	var t Ticket
	var orderID sql.NullString
	if err := row.Scan(&t.ID, &t.UserID, &t.Email, &t.Subject, &t.Category, &orderID, &t.Priority, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if orderID.Valid {
		t.OrderID = &orderID.String
	}

	msgs, err := s.listMessages(ctx, id)
	if err != nil {
		return nil, err
	}
	t.Messages = msgs
	return &t, nil
}

func (s *Store) ListTickets(ctx context.Context, userID string, limit, offset int) ([]Ticket, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	var (
		rows pgx.Rows
		err  error
	)
	if userID != "" {
		rows, err = s.pool.Query(ctx, `
			SELECT id, user_id, email, subject, category, order_id, priority, status, created_at, updated_at
			FROM support_tickets WHERE user_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, userID, limit, offset)
	} else {
		rows, err = s.pool.Query(ctx, `
			SELECT id, user_id, email, subject, category, order_id, priority, status, created_at, updated_at
			FROM support_tickets
			ORDER BY created_at DESC LIMIT $1 OFFSET $2
		`, limit, offset)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Ticket, 0)
	for rows.Next() {
		var t Ticket
		var orderID sql.NullString
		if err := rows.Scan(&t.ID, &t.UserID, &t.Email, &t.Subject, &t.Category, &orderID, &t.Priority, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if orderID.Valid {
			t.OrderID = &orderID.String
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) AddMessage(ctx context.Context, ticketID string, req CreateMessageRequest) (*TicketMessage, error) {
	now := time.Now().UTC()
	msgID := uuid.NewString()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		INSERT INTO support_messages (id, ticket_id, author, author_role, body, created_at)
		SELECT $1, id, $2, $3, $4, $5 FROM support_tickets WHERE id = $6
	`, msgID, req.Author, req.AuthorRole, req.Body, now, ticketID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	if _, err := tx.Exec(ctx, `UPDATE support_tickets SET updated_at=$1 WHERE id=$2`, now, ticketID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &TicketMessage{
		ID:         msgID,
		TicketID:   ticketID,
		Author:     req.Author,
		AuthorRole: req.AuthorRole,
		Body:       req.Body,
		CreatedAt:  now,
	}, nil
}

func (s *Store) UpdateStatus(ctx context.Context, ticketID string, status TicketStatus) (*Ticket, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE support_tickets SET status=$1, updated_at=NOW() WHERE id=$2
	`, status, ticketID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return s.GetTicket(ctx, ticketID)
}

func (s *Store) listMessages(ctx context.Context, ticketID string) ([]TicketMessage, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, ticket_id, author, author_role, body, created_at
		FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC
	`, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]TicketMessage, 0)
	for rows.Next() {
		var m TicketMessage
		if err := rows.Scan(&m.ID, &m.TicketID, &m.Author, &m.AuthorRole, &m.Body, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
