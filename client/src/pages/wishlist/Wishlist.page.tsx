import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { WishlistItem } from '@/shared/types/entities.types';
import LoadingAnimation from '@/shared/components/LoadingAnimation';

export function WishlistPage() {
    const { auth } = useAuth();
    const { wishlistApi } = useApi();
    const { displayMessage } = useMessages();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyProductId, setBusyProductId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!auth?.user) return;
        setLoading(true);
        try {
            const res = await wishlistApi.getWishlist(auth.user.user_id);
            setItems(res.items ?? []);
        } catch {
            displayMessage({ message: 'Could not load wishlist', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [auth?.user, wishlistApi, displayMessage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const remove = async (productId: string) => {
        if (!auth?.user) return;
        setBusyProductId(productId);
        try {
            await wishlistApi.removeFromWishlist(auth.user.user_id, productId);
            setItems((prev) => prev.filter((it) => it.product_id !== productId));
        } catch {
            displayMessage({ message: 'Could not remove item', type: 'error' });
        } finally {
            setBusyProductId(null);
        }
    };

    const moveToCart = async (productId: string) => {
        if (!auth?.user) return;
        setBusyProductId(productId);
        try {
            await wishlistApi.moveToCart(auth.user.user_id, productId, 1);
            setItems((prev) => prev.filter((it) => it.product_id !== productId));
            displayMessage({ message: 'Moved to cart', type: 'success' });
        } catch {
            displayMessage({ message: 'Could not move to cart', type: 'error' });
        } finally {
            setBusyProductId(null);
        }
    };

    const clearAll = async () => {
        if (!auth?.user) return;
        if (!confirm('Empty your entire wishlist?')) return;
        try {
            await wishlistApi.clearWishlist(auth.user.user_id);
            setItems([]);
        } catch {
            displayMessage({ message: 'Could not clear wishlist', type: 'error' });
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
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Your Wishlist</h1>
                    <p className="text-sm text-text-700">
                        {items.length} saved item{items.length === 1 ? '' : 's'}
                    </p>
                </div>
                {items.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                        Clear wishlist
                    </button>
                )}
            </header>

            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 p-10 text-center">
                    <p className="mb-3 text-lg">Nothing saved yet.</p>
                    <Link
                        to="/products"
                        className="inline-block rounded-md bg-primary-500 px-4 py-2 font-medium text-white"
                    >
                        Browse products
                    </Link>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((it) => {
                        const p = it.__product__;
                        const outOfStock = (p?.stock ?? 0) <= 0;
                        return (
                            <li
                                key={it.product_id}
                                className="flex flex-col overflow-hidden rounded-lg border border-primary-100 bg-white"
                            >
                                <Link to={`/product/${it.product_id}`} className="block">
                                    <img
                                        src={p?.thumbnail || ''}
                                        alt={p?.title}
                                        className="h-44 w-full object-contain bg-primary-50"
                                    />
                                </Link>
                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <Link
                                        to={`/product/${it.product_id}`}
                                        className="line-clamp-2 font-semibold hover:text-primary-500"
                                    >
                                        {p?.title ?? 'Product'}
                                    </Link>
                                    <span className="text-lg font-bold">${p?.price?.toFixed?.(2) ?? '—'}</span>
                                    <span
                                        className={`text-xs font-medium ${outOfStock ? 'text-red-700' : 'text-green-700'}`}
                                    >
                                        {outOfStock ? 'Out of stock' : `${p?.stock ?? 0} in stock`}
                                    </span>
                                    <div className="mt-auto flex gap-2">
                                        <button
                                            disabled={outOfStock || busyProductId === it.product_id}
                                            onClick={() => moveToCart(it.product_id)}
                                            className="flex-1 rounded-md bg-primary-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            {busyProductId === it.product_id ? '...' : 'Move to cart'}
                                        </button>
                                        <button
                                            disabled={busyProductId === it.product_id}
                                            onClick={() => remove(it.product_id)}
                                            className="rounded-md border border-primary-200 px-3 py-2 text-sm font-medium hover:bg-primary-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}
