import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { OrderController } from '@/api/orders/order.controller';
import { validationMiddleware, authorizationMiddleware, tryCatchMiddleware } from '@/middlewares';
import {
    getOrdersSchema,
    createOrderForGuestUserSchema,
    createOrderForAuthenticatedUserSchema,
    updateOrderSchema,
    deleteOrderSchema,
    updateProductsStocksSchema,
    getSingleOrderSchema,
    reorderSchema,
} from '@/api/orders/order.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(getOrdersSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.getOrders)
);

// Deep chain: fetch a single order for details/tracking page.
router.get(
    '/single/:order_id',
    authorizationMiddleware,
    checkSchema(getSingleOrderSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.getSingleOrder)
);

router.post(
    '/',
    checkSchema(createOrderForGuestUserSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.createOrderForGuestUser)
);

router.post(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(createOrderForAuthenticatedUserSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.createOrderForAuthenticatedUser)
);

// Deep chain: copy previous order lines back into the current cart.
router.post(
    '/:order_id/reorder',
    authorizationMiddleware,
    checkSchema(reorderSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.reorder)
);

router.patch(
    '/:order_id',
    authorizationMiddleware,
    checkSchema(updateOrderSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.updateOrder)
);

router.patch(
    '/',
    checkSchema(updateProductsStocksSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.updateProductsStocks)
);

router.delete(
    '/:order_id',
    authorizationMiddleware,
    checkSchema(deleteOrderSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderController.deleteOrder)
);

export default router;
