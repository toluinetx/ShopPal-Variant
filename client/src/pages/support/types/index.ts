export type TicketStatus =
    | 'open'
    | 'in_progress'
    | 'waiting_customer'
    | 'resolved'
    | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketMessage = {
    id: string;
    ticket_id: string;
    author: string;
    author_role: string;
    body: string;
    created_at: string;
};

export type Ticket = {
    id: string;
    user_id: string;
    email: string;
    subject: string;
    category: string;
    order_id?: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    messages?: TicketMessage[];
};

export type CreateTicketPayload = {
    user_id: string;
    email: string;
    subject: string;
    category: string;
    order_id?: string;
    priority?: TicketPriority;
    body: string;
};
