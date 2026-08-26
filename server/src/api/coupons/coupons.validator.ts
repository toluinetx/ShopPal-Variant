import { Schema } from 'express-validator';

export const listCouponsSchema: Schema = {};

export const validateCouponSchema: Schema = {
    code: {
        in: ['body'],
        notEmpty: { errorMessage: 'code is required' },
        isString: true,
        trim: true,
        toUpperCase: true,
    },
    subtotal: {
        in: ['body'],
        notEmpty: { errorMessage: 'subtotal is required' },
        isFloat: { options: { min: 0 } },
    },
};

export const createCouponSchema: Schema = {
    code: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        trim: true,
        toUpperCase: true,
        isLength: { options: { min: 3, max: 32 } },
    },
    description: { in: ['body'], optional: true },
    type: {
        in: ['body'],
        isIn: { options: [['percentage', 'flat']], errorMessage: 'type must be percentage|flat' },
    },
    value: {
        in: ['body'],
        isFloat: { options: { min: 0 } },
    },
    min_order_total: { in: ['body'], optional: true, isFloat: { options: { min: 0 } } },
    max_discount: { in: ['body'], optional: true, isFloat: { options: { min: 0 } } },
    usage_limit: { in: ['body'], optional: true, isInt: { options: { min: 1 } } },
    valid_from: { in: ['body'], optional: true, isISO8601: true },
    valid_until: { in: ['body'], optional: true, isISO8601: true },
    active: { in: ['body'], optional: true, isBoolean: true },
};

export const applyCouponSchema: Schema = validateCouponSchema;
