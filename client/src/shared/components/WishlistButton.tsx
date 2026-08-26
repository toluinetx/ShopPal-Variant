import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import { useNavigate } from 'react-router-dom';

type WishlistButtonProps = {
    productId: string;
    className?: string;
};

// Live heart button used on product pages & product cards. When the user is
// signed in we mirror server state; guests are prompted to log in when they
// try to save something.
export function WishlistButton({ productId, className = '' }: WishlistButtonProps) {
    const { auth } = useAuth();
    const { wishlistApi } = useApi();
    const { displayMessage } = useMessages();
    const navigate = useNavigate();
    const [inWishlist, setInWishlist] = useState(false);
    const [loading, setLoading] = useState(false);

    // Hydrate on mount for logged-in users. Cheap: single list fetch.
    useEffect(() => {
        if (!auth?.user) return;
        let cancelled = false;
        wishlistApi
            .getWishlist(auth.user.user_id)
            .then((res) => {
                if (cancelled) return;
                setInWishlist(res.items.some((i) => i.product_id === productId));
            })
            .catch(() => {
                /* ignore – heart just stays inactive */
            });
        return () => {
            cancelled = true;
        };
    }, [auth?.user, productId, wishlistApi]);

    const toggle = async () => {
        if (!auth?.user) {
            displayMessage({ message: 'Please log in to save items to your wishlist.', type: 'error' });
            navigate('/auth/login');
            return;
        }
        setLoading(true);
        try {
            if (inWishlist) {
                await wishlistApi.removeFromWishlist(auth.user.user_id, productId);
                setInWishlist(false);
                displayMessage({ message: 'Removed from wishlist', type: 'success' });
            } else {
                await wishlistApi.addToWishlist(auth.user.user_id, productId);
                setInWishlist(true);
                displayMessage({ message: 'Saved to wishlist', type: 'success' });
            }
        } catch (err) {
            displayMessage({ message: 'Could not update wishlist', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            onClick={toggle}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 font-semibold transition hover:bg-primary-50 disabled:opacity-60 ${className}`}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={inWishlist ? '#EB7AA5' : 'none'}
                stroke={inWishlist ? '#EB7AA5' : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{inWishlist ? 'Saved' : 'Save'}</span>
        </button>
    );
}
