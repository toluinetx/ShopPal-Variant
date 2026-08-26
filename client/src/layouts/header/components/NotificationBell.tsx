import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';

// Small header widget: shows a bell with an unread-count badge and links to
// the /notifications inbox. Polls every 45s while the tab is visible.
export function NotificationBell() {
    const { auth } = useAuth();
    const { notificationsApi } = useApi();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!auth?.user) return;
        let cancelled = false;

        const fetchUnread = async () => {
            try {
                const res = await notificationsApi.list(auth.user!.user_id, { limit: 1, unread_only: true });
                if (!cancelled) setUnread(res.unread_count ?? 0);
            } catch {
                /* ignore */
            }
        };
        void fetchUnread();
        const iv = setInterval(fetchUnread, 45_000);
        const onVisible = () => document.visibilityState === 'visible' && fetchUnread();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearInterval(iv);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [auth?.user, notificationsApi]);

    if (!auth?.user) return null;

    return (
        <Link
            to="/notifications"
            title="Notifications"
            className="relative inline-flex items-center justify-center rounded-md border border-solid border-text-950 p-1"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </Link>
    );
}
