import AppError from '@/shared/exceptions/app-error';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { WishlistRepository } from './wishlist.repository';
import { CartRepository } from '@/api/carts/carts.repository';
import { emitEvent } from '@/shared/utils/notifier';

export class WishlistService {
    static async getWishlist(user_id: string) {
        return WishlistRepository.getWishlist(user_id);
    }

    static async addToWishlist(user_id: string, product_id: string) {
        await WishlistRepository.addToWishlist(user_id, product_id);
        emitEvent({ type: 'wishlist.item_added', payload: { user_id, product_id } });
    }

    static async removeFromWishlist(user_id: string, product_id: string) {
        const result = await WishlistRepository.removeFromWishlist(user_id, product_id);
        if (result.affected === 0) {
            throw new AppError('Item not found in wishlist', HttpStatusCode.NOT_FOUND, 'removeFromWishlist');
        }
        emitEvent({ type: 'wishlist.item_removed', payload: { user_id, product_id } });
    }

    static async clearWishlist(user_id: string) {
        await WishlistRepository.clearWishlist(user_id);
    }

    // Deep chain: add to cart from wishlist. Reuses the existing CartRepository upsert
    // (so quantities merge if the product is already in the cart) and then removes the
    // wishlist entry.
    static async moveToCart(user_id: string, product_id: string, quantity: number) {
        const exists = await WishlistRepository.exists(user_id, product_id);
        if (!exists) {
            throw new AppError('Item not found in wishlist', HttpStatusCode.NOT_FOUND, 'moveToCart');
        }
        await CartRepository.addProductToCart(user_id, product_id, quantity);
        await WishlistRepository.removeFromWishlist(user_id, product_id);
        emitEvent({
            type: 'wishlist.moved_to_cart',
            payload: { user_id, product_id, quantity },
        });
    }
}
