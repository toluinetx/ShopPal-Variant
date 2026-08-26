import { Router } from 'express';
import { checkSchema } from 'express-validator';
import {
    authorizationMiddleware,
    adminAuthorizationMiddleware,
    validationMiddleware,
    tryCatchMiddleware,
} from '@/middlewares';
import { OrderTrackingController } from './order-tracking.controller';
import { getTrackingSchema, addTrackingEventSchema } from './order-tracking.validator';

const router = Router();

// Any logged-in shopper can read their own order's tracking timeline.
router.get(
    '/:order_id',
    authorizationMiddleware,
    checkSchema(getTrackingSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderTrackingController.list)
);

// Only admins can push tracking updates.
router.post(
    '/:order_id',
    adminAuthorizationMiddleware,
    checkSchema(addTrackingEventSchema),
    validationMiddleware,
    tryCatchMiddleware(OrderTrackingController.addEvent)
);

export default router;
