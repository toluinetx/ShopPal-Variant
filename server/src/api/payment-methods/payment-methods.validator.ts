import { Schema } from 'express-validator';

const userIdMatchesJwt: Schema[string] = {
    in: ['params'],
    notEmpty: { errorMessage: 'User ID is required!' },
    custom: {
        options: (value, { req }) => value === req.jwtDecodedPayload?.user_id,
        errorMessage: 'User ID does not match the logged-in user ID',
    },
};

export const listPaymentMethodsSchema: Schema = { user_id: userIdMatchesJwt };

// Card body is validated only enough to store safe metadata. We NEVER accept
// or store the full PAN/CVV in this endpoint – the caller sends only the
// last 4 digits, brand, expiry, and holder name (as if returned by a
// tokenized payment SDK on the frontend).
export const createPaymentMethodSchema: Schema = {
    user_id: userIdMatchesJwt,
    type: {
        in: ['body'],
        notEmpty: { errorMessage: 'type is required' },
        isIn: { options: [['card', 'paypal']], errorMessage: 'type must be one of card|paypal' },
    },
    label: {
        in: ['body'],
        notEmpty: { errorMessage: 'label is required' },
        isLength: { options: { max: 60 } },
    },
    last_four: {
        in: ['body'],
        optional: true,
        matches: { options: /^\d{4}$/, errorMessage: 'last_four must be exactly 4 digits' },
    },
    brand: { in: ['body'], optional: true },
    holder_name: { in: ['body'], optional: true },
    exp_month: {
        in: ['body'],
        optional: true,
        isInt: { options: { min: 1, max: 12 } },
    },
    exp_year: {
        in: ['body'],
        optional: true,
        isInt: { options: { min: new Date().getFullYear(), max: new Date().getFullYear() + 30 } },
    },
    is_default: { in: ['body'], optional: true, isBoolean: true },
};

export const deletePaymentMethodSchema: Schema = {
    user_id: userIdMatchesJwt,
    payment_method_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
    },
};

export const setDefaultPaymentMethodSchema: Schema = deletePaymentMethodSchema;
