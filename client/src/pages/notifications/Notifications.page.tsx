import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { UserNotification } from '@/shared/types/entities.types';
import LoadingAnimation from '@/shared/components/LoadingAnimation';

const TYPE_LABELS: Record<string, string> = {
    order_placed: 'Order placed',
    order_status_changed: 'Order updated',
    order_cancelled: 'Order cancelled',
    wishlist_price_drop: 'Price drop',
    wishlist_back_in_stock: 'Back in stock',
    question_answered: 'Question answered',
    coupon_issued: 'New coupon',
    review_reply: 'Reply to your review',
    general: 'Notice',
};

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
}

export function NotificationsPage() {
    const { auth } = useAuth();
    const { notificationsApi } = useApi();
    const { displayMessage } = useMessages();
    const [items, setItems] = useState<UserNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const refresh = useCallback(async () => {
        if (!auth?.user) return;
        setLoading(true);
        try {
            const res = await notificationsApi.list(auth.user.user_id, {
                limit: 100,
                unread_only: showUnreadOnly,
            });
            setItems(res.items ?? []);
            setUnread(res.unread_count ?? 0);
        } catch {
            displayMessage({ message: 'Could not load notifications', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [auth?.user, notificationsApi, showUnreadOnly, displayMessage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const markRead = async (n: UserNotification) => {
        if (!auth?.user || n.is_read) return;
        try {
            await notificationsApi.markRead(auth.user.user_id, n.notification_id);
            setItems((prev) =>
                prev.map((it) =>
                    it.notification_id === n.notification_id ? { ...it, is_read: true } : it
                )
            );
            setUnread((u) => Math.max(0, u - 1));
        } catch {
            /* silent */
        }
    };

    const markAllRead = async () => {
        if (!auth?.user) return;
        try {
            await notificationsApi.markAllRead(auth.user.user_id);
            setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
            setUnread(0);
        } catch {
            displayMessage({ message: 'Could not mark all read', type: 'error' });
        }
    };

    const remove = async (n: UserNotification) => {
        if (!auth?.user) return;
        try {
            await notificationsApi.remove(auth.user.user_id, n.notification_id);
            setItems((prev) => prev.filter((it) => it.notification_id !== n.notification_id));
            if (!n.is_read) setUnread((u) => Math.max(0, u - 1));
        } catch {
            /* silent */
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center py-24">
                <LoadingAnimation />
            </div>
        );
    }

    return (
        <main className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-sm text-text-700">
                        {unread} unread of {items.length}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showUnreadOnly}
                            onChange={(e) => setShowUnreadOnly(e.target.checked)}
                        />
                        Unread only
                    </label>
                    {unread > 0 && (
                        <button
                            onClick={markAllRead}
                            className="rounded-md border border-primary-300 px-3 py-1 text-sm font-medium hover:bg-primary-50"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
            </header>

            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-10 text-center">
                    You&apos;re all caught up.
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {items.map((n) => (
                        <li
                            key={n.notification_id}
                            className={`flex flex-col gap-1 rounded-lg border p-4 transition ${
                                n.is_read ? 'border-primary-100 bg-white' : 'border-primary-300 bg-primary-50'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                                    <span className="text-xs uppercase tracking-wide text-primary-500">
                                        {TYPE_LABELS[n.type] ?? n.type}
                                    </span>
                                </div>
                                <span className="text-xs text-text-700">{relativeTime(n.created_at)}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-semibold">{n.title}</p>
                                    {n.body && <p className="text-sm text-text-700">{n.body}</p>}
                                    {n.action_url && (
                                        <Link
                                            to={n.action_url}
                                            onClick={() => void markRead(n)}
                                            className="mt-2 inline-block text-sm font-medium text-primary-500 hover:underline"
                                        >
                                            View &rarr;
                                        </Link>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!n.is_read && (
                                        <button
                                            onClick={() => void markRead(n)}
                                            className="rounded-md border border-primary-300 px-2 py-1 text-xs hover:bg-primary-100"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => void remove(n)}
                                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
