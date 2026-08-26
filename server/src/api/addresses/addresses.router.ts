import { Router } from 'express';
import { checkSchema } from 'express-validator';
import { authorizationMiddleware, validationMiddleware, tryCatchMiddleware } from '@/middlewares';
import { AddressController } from './addresses.controller';
import {
    listAddressesSchema,
    createAddressSchema,
    updateAddressSchema,
    deleteAddressSchema,
    setDefaultAddressSchema,
} from './addresses.validator';

const router = Router();

router.get(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(listAddressesSchema),
    validationMiddleware,
    tryCatchMiddleware(AddressController.list)
);

router.post(
    '/:user_id',
    authorizationMiddleware,
    checkSchema(createAddressSchema),
    validationMiddleware,
    tryCatchMiddleware(AddressController.create)
);

router.patch(
    '/:user_id/:address_id',
    authorizationMiddleware,
    checkSchema(updateAddressSchema),
    validationMiddleware,
    tryCatchMiddleware(AddressController.update)
);

router.post(
    '/:user_id/:address_id/set-default',
    authorizationMiddleware,
    checkSchema(setDefaultAddressSchema),
    validationMiddleware,
    tryCatchMiddleware(AddressController.setDefault)
);

router.delete(
    '/:user_id/:address_id',
    authorizationMiddleware,
    checkSchema(deleteAddressSchema),
    validationMiddleware,
    tryCatchMiddleware(AddressController.delete)
);

export default router;
