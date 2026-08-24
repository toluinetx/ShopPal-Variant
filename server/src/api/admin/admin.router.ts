import { Router } from 'express';
import { checkSchema } from 'express-validator';

import { validationMiddleware } from '@/middlewares/validation.middleware';
import tryCatchMiddleware from '@/middlewares/tryCatch.middleware';
import AdminController from './admin.controller';
import { loginByUsernameSchema, loginByEmailSchema } from './admin.validator';

const router = Router();

router.get('/refresh-token', tryCatchMiddleware(AdminController.refreshToken));

router.post('/logout', tryCatchMiddleware(AdminController.logout));

router.post(
    '/loginByUsername',
    checkSchema(loginByUsernameSchema),
    validationMiddleware,
    tryCatchMiddleware(AdminController.login)
);

router.post(
    '/loginByEmail',
    checkSchema(loginByEmailSchema),
    validationMiddleware,
    tryCatchMiddleware(AdminController.login)
);

export default router;
