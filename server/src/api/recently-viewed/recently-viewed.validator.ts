import { Schema } from 'express-validator';

const userIdMatchesJwt: Schema[string] = {
    in: ['params'],
    notEmpty: { errorMessage: 'User ID is required!' },
    custom: {
        options: (value, { req }) => value === req.jwtDecodedPayload?.user_id,
        errorMessage: 'User ID does not match the logged-in user ID',
    },
};

export const listRecentlyViewedSchema: Schema = {
    user_id: userIdMatchesJwt,
    limit: { in: ['query'], optional: true, isInt: { options: { min: 1, max: 50 } }, toInt: true },
};

export const recordViewSchema: Schema = {
    user_id: userIdMatchesJwt,
    product_id: {
        in: ['body'],
        notEmpty: { errorMessage: 'product_id is required' },
        isUUID: true,
    },
};
