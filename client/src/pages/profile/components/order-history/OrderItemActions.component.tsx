import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { OrderStatus } from '@/shared/types';

interface OrderItemActionsProps {
    orderID: string;
    orderStatus: OrderStatus;
    onCancelled?: () => void;
}

export function OrderItemActions({ orderID, orderStatus, onCancelled }: OrderItemActionsProps) {
    const { orderApi } = useApi();
    const { auth } = useAuth();
    const { displayMessage } = useMessages();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    const reorder = async () => {
        setBusy(true);
        try {
            await orderApi.reorder(orderID);
            displayMessage({ message: 'Items added back to your cart', type: 'success' });
            navigate('/cart');
        } catch {
            displayMessage({ message: 'Could not reorder', type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const cancel = async () => {
        if (!auth?.user) return;
        if (!confirm('Cancel this order? This cannot be undone.')) return;
        setBusy(true);
        try {
            await orderApi.cancelOrder(orderID, auth.user.user_id);
            displayMessage({ message: 'Order cancelled', type: 'success' });
            onCancelled?.();
        } catch {
            displayMessage({
                message: 'Could not cancel order (only recently placed orders can be cancelled)',
                type: 'error',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap gap-2"
        >
            <Link
                to={`/order/${orderID}`}
                className="rounded-md border border-primary-300 px-3 py-1 text-xs font-medium hover:bg-primary-50"
            >
                Track / View Details
            </Link>
            <button
                type="button"
                onClick={reorder}
                disabled={busy}
                className="rounded-md bg-primary-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
                Reorder
            </button>
            {orderStatus === 'purchased' && (
                <button
                    type="button"
                    onClick={cancel}
                    disabled={busy}
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}
