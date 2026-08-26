import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { RecentlyViewedController } from './recently-viewed.controller';
import { listRecentlyViewedSchema, recordViewSchema } from './recently-viewed.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(listRecentlyViewedSchema),
    validationMiddleware,
    tryCatchMiddleware(RecentlyViewedController.list)
);

router.post(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(recordViewSchema),
    validationMiddleware,
    tryCatchMiddleware(RecentlyViewedController.record)
);

export default router;
