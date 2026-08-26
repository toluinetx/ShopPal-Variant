import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import LoadingAnimation from '@/shared/components/LoadingAnimation';
import type { OrderDetail, OrderTrackingEvent } from '@/shared/types/entities.types';

const STATUS_STEPS: { key: string; label: string }[] = [
    { key: 'order_placed', label: 'Order placed' },
    { key: 'payment_confirmed', label: 'Payment confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
];

export function OrderPage() {
    const params = useParams<{ id: string }>();
    const { auth } = useAuth();
    const { orderApi, trackingApi } = useApi();
    const { displayMessage } = useMessages();
    const navigate = useNavigate();

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [events, setEvents] = useState<OrderTrackingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        if (!params.id) return;
        setLoading(true);
        try {
            const [orderRes, trackingRes] = await Promise.all([
                orderApi.getSingleOrder(params.id),
                trackingApi.getTracking(params.id),
            ]);
            setOrder(orderRes.order);
            setEvents(trackingRes.events ?? []);
        } catch {
            displayMessage({ message: 'Could not load order', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [params.id, orderApi, trackingApi, displayMessage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const cancel = async () => {
        if (!order || !auth?.user) return;
        if (!confirm('Cancel this order? This cannot be undone.')) return;
        setBusy(true);
        try {
            await orderApi.cancelOrder(order.order_id, auth.user.user_id);
            displayMessage({ message: 'Order cancelled', type: 'success' });
            navigate(`/profile/${auth.user.user_id}`);
        } catch {
            displayMessage({ message: 'Could not cancel order (only recently placed orders can be cancelled)', type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const reorder = async () => {
        if (!order) return;
        setBusy(true);
        try {
            await orderApi.reorder(order.order_id);
            displayMessage({ message: 'Items added back to your cart', type: 'success' });
            navigate('/cart');
        } catch {
            displayMessage({ message: 'Could not reorder', type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center py-24">
                <LoadingAnimation />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <p className="text-lg">Order not found.</p>
                <Link to="/products" className="mt-4 inline-block text-primary-500 hover:underline">
                    Continue shopping
                </Link>
            </div>
        );
    }

    // Compute the furthest reached status from event history.
    const reachedIdx = events.reduce((max, e) => {
        const idx = STATUS_STEPS.findIndex((s) => s.key === e.status);
        return idx > max ? idx : max;
    }, -1);
    const cancelled = events.some((e) => e.status === 'cancelled');

    return (
        <main className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Order #{order.order_id.slice(0, 8)}</h1>
                    <p className="text-sm text-text-700">
                        Placed on{' '}
                        {new Date(order.issued_time).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={reorder}
                        disabled={busy}
                        className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        Reorder
                    </button>
                    {!cancelled && order.order_status === 'purchased' && (
                        <button
                            onClick={cancel}
                            disabled={busy}
                            className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                            Cancel order
                        </button>
                    )}
                </div>
            </header>

            {/* Tracking timeline */}
            <section className="rounded-lg border border-primary-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-bold">Delivery tracking</h2>
                {cancelled ? (
                    <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">This order was cancelled.</p>
                ) : (
                    <ol className="flex flex-wrap gap-4">
                        {STATUS_STEPS.map((step, idx) => {
                            const done = idx <= reachedIdx;
                            const current = idx === reachedIdx;
                            return (
                                <li key={step.key} className="flex flex-1 min-w-[110px] flex-col items-center gap-1">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                            done
                                                ? current
                                                    ? 'bg-primary-500 text-white ring-4 ring-primary-200'
                                                    : 'bg-primary-500 text-white'
                                                : 'bg-primary-100 text-primary-500'
                                        }`}
                                    >
                                        {done ? '✓' : idx + 1}
                                    </div>
                                    <span
                                        className={`text-center text-xs ${done ? 'font-semibold' : 'text-text-700'}`}
                                    >
                                        {step.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {events.length > 0 && (
                    <details className="mt-6">
                        <summary className="cursor-pointer text-sm font-medium text-primary-500">
                            Full event log ({events.length})
                        </summary>
                        <ul className="mt-3 flex flex-col gap-2">
                            {events.map((e) => (
                                <li
                                    key={e.tracking_id}
                                    className="flex items-start justify-between gap-3 rounded-md border border-primary-100 p-3 text-sm"
                                >
                                    <div>
                                        <p className="font-semibold">
                                            {STATUS_STEPS.find((s) => s.key === e.status)?.label ?? e.status}
                                        </p>
                                        {e.location && <p className="text-xs text-text-700">{e.location}</p>}
                                        {e.message && <p className="text-xs text-text-700">{e.message}</p>}
                                    </div>
                                    <span className="text-xs text-text-700">
                                        {new Date(e.created_at).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </section>

            {/* Items */}
            <section className="rounded-lg border border-primary-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-bold">Items ({order.products?.length ?? 0})</h2>
                <ul className="flex flex-col divide-y divide-primary-100">
                    {order.products?.map((p) => (
                        <li key={p.product_id} className="flex items-center gap-4 py-3">
                            <Link to={`/product/${p.product_id}`}>
                                <img
                                    src={p.thumbnail}
                                    alt={p.title}
                                    className="h-16 w-16 rounded object-contain bg-primary-50"
                                />
                            </Link>
                            <div className="flex-1">
                                <Link
                                    to={`/product/${p.product_id}`}
                                    className="font-semibold hover:text-primary-500"
                                >
                                    {p.title}
                                </Link>
                                {p.brand && <p className="text-xs text-text-700">{p.brand}</p>}
                                <p className="text-sm text-text-700">Qty {p.quantity}</p>
                            </div>
                            <span className="font-bold">${(p.price * p.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                    {order.subtotal != null && (
                        <div className="flex w-full max-w-xs justify-between">
                            <span>Subtotal</span>
                            <span>${order.subtotal.toFixed(2)}</span>
                        </div>
                    )}
                    {!!order.discount_amount && (
                        <div className="flex w-full max-w-xs justify-between text-green-700">
                            <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                            <span>-${order.discount_amount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex w-full max-w-xs justify-between border-t border-primary-100 pt-2 text-base font-bold">
                        <span>Total</span>
                        <span>${(order.total ?? order.subtotal ?? 0).toFixed(2)}</span>
                    </div>
                </div>
            </section>

            {/* Delivery address */}
            <section className="rounded-lg border border-primary-100 bg-white p-6">
                <h2 className="mb-4 text-lg font-bold">Delivery address</h2>
                <p className="text-sm">
                    {order.delivery_address?.street}, {order.delivery_address?.city},{' '}
                    {order.delivery_address?.country}
                </p>
            </section>
        </main>
    );
}
