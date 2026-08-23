CREATE TABLE IF NOT EXISTS support_tickets (
    id          UUID PRIMARY KEY,
    user_id     TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    category    TEXT NOT NULL,
    order_id    TEXT,
    priority    TEXT NOT NULL DEFAULT 'normal',
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets (created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
    id          UUID PRIMARY KEY,
    ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author      TEXT NOT NULL,
    author_role TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages (ticket_id);
