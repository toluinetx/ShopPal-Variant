import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import type { RecentlyViewedItem } from '@/shared/types/entities.types';

// Horizontal scrollable strip of the user's recently viewed products. Renders
// nothing until we have data or the user is signed out.
export function RecentlyViewedStrip({ limit = 12, className = '' }: { limit?: number; className?: string }) {
    const { auth } = useAuth();
    const { recentlyViewedApi } = useApi();
    const [items, setItems] = useState<RecentlyViewedItem[]>([]);

    useEffect(() => {
        if (!auth?.user) return;
        let cancelled = false;
        recentlyViewedApi
            .list(auth.user.user_id, limit)
            .then((res) => {
                if (!cancelled) setItems(res.items ?? []);
            })
            .catch(() => {
                /* silent */
            });
        return () => {
            cancelled = true;
        };
    }, [auth?.user, limit, recentlyViewedApi]);

    if (!auth?.user || items.length === 0) return null;

    return (
        <section className={`w-full ${className}`}>
            <h2 className="mb-3 text-xl font-bold">Recently viewed</h2>
            <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                {items.map((it) => (
                    <li
                        key={it.product_id}
                        className="w-40 flex-shrink-0 snap-start rounded-lg border border-primary-100 bg-white"
                    >
                        <Link to={`/product/${it.product_id}`} className="block">
                            <img
                                src={it.product.thumbnail || ''}
                                alt={it.product.title}
                                className="h-28 w-full rounded-t-lg object-contain bg-primary-50"
                            />
                            <div className="p-2">
                                <p className="line-clamp-2 text-sm font-medium">{it.product.title}</p>
                                <p className="text-sm font-bold">${it.product.price?.toFixed?.(2)}</p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
