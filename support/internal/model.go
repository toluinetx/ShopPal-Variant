package internal

import "time"

type TicketStatus string

const (
	StatusOpen       TicketStatus = "open"
	StatusInProgress TicketStatus = "in_progress"
	StatusWaiting    TicketStatus = "waiting_customer"
	StatusResolved   TicketStatus = "resolved"
	StatusClosed     TicketStatus = "closed"
)

func (s TicketStatus) Valid() bool {
	switch s {
	case StatusOpen, StatusInProgress, StatusWaiting, StatusResolved, StatusClosed:
		return true
	}
	return false
}

type TicketPriority string

const (
	PriorityLow    TicketPriority = "low"
	PriorityNormal TicketPriority = "normal"
	PriorityHigh   TicketPriority = "high"
	PriorityUrgent TicketPriority = "urgent"
)

func (p TicketPriority) Valid() bool {
	switch p {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	}
	return false
}

type Ticket struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	Email       string          `json:"email"`
	Subject     string          `json:"subject"`
	Category    string          `json:"category"`
	OrderID     *string         `json:"order_id,omitempty"`
	Priority    TicketPriority  `json:"priority"`
	Status      TicketStatus    `json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	Messages    []TicketMessage `json:"messages,omitempty"`
}

type TicketMessage struct {
	ID        string    `json:"id"`
	TicketID  string    `json:"ticket_id"`
	Author    string    `json:"author"`
	AuthorRole string   `json:"author_role"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateTicketRequest struct {
	UserID   string         `json:"user_id"`
	Email    string         `json:"email"`
	Subject  string         `json:"subject"`
	Category string         `json:"category"`
	OrderID  *string        `json:"order_id,omitempty"`
	Priority TicketPriority `json:"priority,omitempty"`
	Body     string         `json:"body"`
}

type CreateMessageRequest struct {
	Author     string `json:"author"`
	AuthorRole string `json:"author_role"`
	Body       string `json:"body"`
}

type UpdateStatusRequest struct {
	Status TicketStatus `json:"status"`
}

var Categories = []string{
	"order_issue",
	"refund_request",
	"shipping",
	"account",
	"payment",
	"product_question",
	"other",
}
