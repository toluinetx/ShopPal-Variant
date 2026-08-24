import { Router } from 'express';
import tryCatchMiddleware from '@/middlewares/tryCatch.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import adminAuthorizationMiddleware from '@/middlewares/adminAuthorization.middleware';
import ProductController from './product.controller';
import { checkSchema } from 'express-validator';
import ProductSchemaValidator from './product.validator';
const router = Router();

router.get('/',
    checkSchema(ProductSchemaValidator.getManyProductSchema),
    validationMiddleware,
    tryCatchMiddleware(ProductController.getManyProducts));

// Product creation is only exposed through the admin frontend; requires an admin access token.
router.post('/',
    adminAuthorizationMiddleware,
    checkSchema(ProductSchemaValidator.createProductSchema),
    validationMiddleware,
    tryCatchMiddleware(ProductController.createProduct));

router.get('/:product_id',
    checkSchema(ProductSchemaValidator.getOneProductSchema),
    validationMiddleware,
    tryCatchMiddleware(ProductController.getOneProduct));

// Product updates (price, stock, etc.) are only exposed through the admin frontend; requires an admin access token.
router.patch('/:product_id',
    adminAuthorizationMiddleware,
    checkSchema(ProductSchemaValidator.updateProductSchema),
    validationMiddleware,
    tryCatchMiddleware(ProductController.updateProduct));

// Product deletion is only exposed through the admin frontend; requires an admin access token.
router.delete('/:product_id',
    adminAuthorizationMiddleware,
    checkSchema(ProductSchemaValidator.deleteProductSchema),
    validationMiddleware,
    tryCatchMiddleware(ProductController.deleteProduct));

export default router;
