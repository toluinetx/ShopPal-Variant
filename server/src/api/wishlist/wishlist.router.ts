import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { WishlistController } from './wishlist.controller';
import {
    getWishlistSchema,
    addToWishlistSchema,
    removeFromWishlistSchema,
    clearWishlistSchema,
    moveToCartSchema,
} from './wishlist.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(getWishlistSchema),
    validationMiddleware,
    tryCatchMiddleware(WishlistController.getWishlist)
);

router.post(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(addToWishlistSchema),
    validationMiddleware,
    tryCatchMiddleware(WishlistController.addToWishlist)
);

// Deep chain: move a wishlist item into the cart in one call.
router.post(
    '/:user_id/:product_id/move-to-cart',
    authorizationMiddleware,
    checkSchema(moveToCartSchema),
    validationMiddleware,
    tryCatchMiddleware(WishlistController.moveToCart)
);

router.delete(
    '/:user_id/:product_id',
    authorizationMiddleware,
    checkSchema(removeFromWishlistSchema),
    validationMiddleware,
    tryCatchMiddleware(WishlistController.removeFromWishlist)
);

router.delete(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(clearWishlistSchema),
    validationMiddleware,
    tryCatchMiddleware(WishlistController.clearWishlist)
);

export default router;
