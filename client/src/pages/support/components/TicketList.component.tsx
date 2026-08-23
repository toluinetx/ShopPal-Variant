import { useEffect, useState } from 'react';
import { useSupportApi } from '@/pages/support/hooks/useSupportApi.hook';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import type { Ticket } from '@/pages/support/types';

type Props = {
    refreshToken?: number;
};

const STATUS_STYLES: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_customer: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-200 text-gray-700',
};

export function TicketList({ refreshToken }: Props) {
    const supportApi = useSupportApi();
    const { auth } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        supportApi
            .listTickets(auth?.user?.user_id)
            .then((data) => {
                if (!cancelled) setTickets(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message ?? 'Failed to load tickets');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [supportApi, auth?.user?.user_id, refreshToken]);

    if (loading) return <p className="text-sm text-text-950">Loading tickets...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (tickets.length === 0)
        return <p className="text-sm text-text-950">No tickets yet.</p>;

    return (
        <ul className="flex flex-col gap-3">
            {tickets.map((t) => (
                <li
                    key={t.id}
                    className="rounded border border-solid border-primary-950 bg-background-50 p-4"
                >
                    <div className="flex flex-row items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-500">#{t.id.slice(0, 8)}</p>
                            <p className="text-lg font-medium">{t.subject}</p>
                            <p className="text-xs text-gray-600">
                                {t.category.replace(/_/g, ' ')} · priority {t.priority} ·{' '}
                                {new Date(t.created_at).toLocaleString()}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                STATUS_STYLES[t.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {t.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
