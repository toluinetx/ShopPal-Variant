import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { PaymentMethodController } from './payment-methods.controller';
import {
    listPaymentMethodsSchema,
    createPaymentMethodSchema,
    deletePaymentMethodSchema,
    setDefaultPaymentMethodSchema,
} from './payment-methods.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(listPaymentMethodsSchema),
    validationMiddleware,
    tryCatchMiddleware(PaymentMethodController.list)
);

router.post(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(createPaymentMethodSchema),
    validationMiddleware,
    tryCatchMiddleware(PaymentMethodController.create)
);

router.post(
    '/:user_id/:payment_method_id/set-default',
    authorizationMiddleware,
    checkSchema(setDefaultPaymentMethodSchema),
    validationMiddleware,
    tryCatchMiddleware(PaymentMethodController.setDefault)
);

router.delete(
    '/:user_id/:payment_method_id',
    authorizationMiddleware,
    checkSchema(deletePaymentMethodSchema),
    validationMiddleware,
    tryCatchMiddleware(PaymentMethodController.delete)
);

export default router;
