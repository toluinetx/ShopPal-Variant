import { Request, Response } from 'express';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import { WishlistService } from './wishlist.service';

export class WishlistController {
    static async getWishlist(req: Request, res: Response) {
        const items = await WishlistService.getWishlist(req.params.user_id);
        res.status(HttpStatusCode.OK).json({ items });
    }

    static async addToWishlist(req: Request, res: Response) {
        const { user_id } = req.params;
        const { product_id } = req.body;
        await WishlistService.addToWishlist(user_id, product_id);
        res.status(HttpStatusCode.CREATED).json({ message: 'Added to wishlist' });
    }

    static async removeFromWishlist(req: Request, res: Response) {
        const { user_id, product_id } = req.params;
        await WishlistService.removeFromWishlist(user_id, product_id);
        res.status(HttpStatusCode.OK).json({ message: 'Removed from wishlist' });
    }

    static async clearWishlist(req: Request, res: Response) {
        await WishlistService.clearWishlist(req.params.user_id);
        res.status(HttpStatusCode.OK).json({ message: 'Wishlist cleared' });
    }

    static async moveToCart(req: Request, res: Response) {
        const { user_id, product_id } = req.params;
        const quantity = Number(req.body?.quantity ?? 1);
        await WishlistService.moveToCart(user_id, product_id, quantity);
        res.status(HttpStatusCode.OK).json({ message: 'Moved to cart', product_id, quantity });
    }
}
