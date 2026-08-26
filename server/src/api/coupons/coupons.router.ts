import { Router } from 'express';
import { checkSchema } from 'express-validator';
import {
    validationMiddleware,
    tryCatchMiddleware,
    adminAuthorizationMiddleware,
    authorizationMiddleware,
} from '@/middlewares';
import { CouponController } from './coupons.controller';
import {
    validateCouponSchema,
    applyCouponSchema,
    createCouponSchema,
} from './coupons.validator';

const router = Router();

// Public – shows only active + currently-valid coupons so users can browse deals.
router.get('/', tryCatchMiddleware(CouponController.list));

// Public read: dry-run a coupon against a subtotal, does NOT increment usage.
router.post(
    '/validate',
    checkSchema(validateCouponSchema),
    validationMiddleware,
    tryCatchMiddleware(CouponController.validate)
);

// Auth required: consumes one usage slot – call at checkout submit time.
router.post(
    '/apply',
    authorizationMiddleware,
    checkSchema(applyCouponSchema),
    validationMiddleware,
    tryCatchMiddleware(CouponController.apply)
);

// Admin only
router.post(
    '/',
    adminAuthorizationMiddleware,
    checkSchema(createCouponSchema),
    validationMiddleware,
    tryCatchMiddleware(CouponController.create)
);

export default router;
