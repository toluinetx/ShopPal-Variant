import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { NotificationController } from './notifications-inbox.controller';
import {
    listNotificationsSchema,
    markReadSchema,
    markAllReadSchema,
} from './notifications-inbox.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(listNotificationsSchema),
    validationMiddleware,
    tryCatchMiddleware(NotificationController.list)
);

router.post(
    '/:user_id/read-all',
    authorizationMiddleware,
    checkSchema(markAllReadSchema),
    validationMiddleware,
    tryCatchMiddleware(NotificationController.markAllRead)
);

router.post(
    '/:user_id/:notification_id/read',
    authorizationMiddleware,
    checkSchema(markReadSchema),
    validationMiddleware,
    tryCatchMiddleware(NotificationController.markRead)
);

router.delete(
    '/:user_id/:notification_id',
    authorizationMiddleware,
    checkSchema(markReadSchema),
    validationMiddleware,
    tryCatchMiddleware(NotificationController.delete)
);

export default router;
