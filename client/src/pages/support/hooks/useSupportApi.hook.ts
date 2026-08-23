import axios from 'axios';
import { useMemo } from 'react';
import type { CreateTicketPayload, Ticket } from '@/pages/support/types';

const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || 'http://localhost:8081';

export function useSupportApi() {
    const client = useMemo(
        () =>
            axios.create({
                baseURL: SUPPORT_URL,
                headers: { 'Content-Type': 'application/json' },
            }),
        []
    );

    return useMemo(
        () => ({
            listCategories: async (): Promise<string[]> => {
                const { data } = await client.get<{ categories: string[] }>('/categories');
                return data.categories;
            },
            createTicket: async (payload: CreateTicketPayload): Promise<Ticket> => {
                const { data } = await client.post<Ticket>('/tickets', payload);
                return data;
            },
            listTickets: async (userId?: string): Promise<Ticket[]> => {
                const { data } = await client.get<Ticket[]>('/tickets', {
                    params: userId ? { user_id: userId } : {},
                });
                return data;
            },
            getTicket: async (id: string): Promise<Ticket> => {
                const { data } = await client.get<Ticket>(`/tickets/${id}`);
                return data;
            },
            addMessage: async (id: string, body: string, author: string) => {
                const { data } = await client.post(`/tickets/${id}/messages`, {
                    body,
                    author,
                    author_role: 'customer',
                });
                return data;
            },
        }),
        [client]
    );
}
