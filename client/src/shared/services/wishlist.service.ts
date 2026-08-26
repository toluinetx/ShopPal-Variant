import type { WishlistItem } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export const useWishlistService = ({ PRIVATE_API }: Deps) => {
    const getWishlist = useCallback(
        async (userId: string): Promise<{ items: WishlistItem[] }> => {
            const res = await PRIVATE_API.get(`/wishlist/${userId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const addToWishlist = useCallback(
        async (userId: string, productId: string) => {
            const res = await PRIVATE_API.post(`/wishlist/${userId}`, { product_id: productId });
            return res.data;
        },
        [PRIVATE_API]
    );

    const removeFromWishlist = useCallback(
        async (userId: string, productId: string) => {
            const res = await PRIVATE_API.delete(`/wishlist/${userId}/${productId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const clearWishlist = useCallback(
        async (userId: string) => {
            const res = await PRIVATE_API.delete(`/wishlist/${userId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    // Deep chain: server-side move-to-cart (adds to cart, removes from wishlist).
    const moveToCart = useCallback(
        async (userId: string, productId: string, quantity = 1) => {
            const res = await PRIVATE_API.post(
                `/wishlist/${userId}/${productId}/move-to-cart`,
                { quantity }
            );
            return res.data;
        },
        [PRIVATE_API]
    );

    return { getWishlist, addToWishlist, removeFromWishlist, clearWishlist, moveToCart };
};
