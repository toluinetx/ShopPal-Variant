import { Schema } from 'express-validator';

const userIdMatchesJwt: Schema[string] = {
    in: ['params'],
    notEmpty: { errorMessage: 'User ID is required!' },
    custom: {
        options: (value, { req }) => value === req.jwtDecodedPayload?.user_id,
        errorMessage: 'User ID does not match the logged-in user ID',
    },
};

export const getWishlistSchema: Schema = {
    user_id: userIdMatchesJwt,
};

export const addToWishlistSchema: Schema = {
    user_id: userIdMatchesJwt,
    product_id: {
        in: ['body'],
        notEmpty: { errorMessage: 'Product ID is required!' },
        isUUID: { errorMessage: 'Product ID must be a valid UUID!' },
    },
};

export const removeFromWishlistSchema: Schema = {
    user_id: userIdMatchesJwt,
    product_id: {
        in: ['params'],
        notEmpty: { errorMessage: 'Product ID is required!' },
        isUUID: { errorMessage: 'Product ID must be a valid UUID!' },
    },
};

export const clearWishlistSchema: Schema = {
    user_id: userIdMatchesJwt,
};

export const moveToCartSchema: Schema = {
    user_id: userIdMatchesJwt,
    product_id: {
        in: ['params'],
        notEmpty: { errorMessage: 'Product ID is required!' },
        isUUID: { errorMessage: 'Product ID must be a valid UUID!' },
    },
    quantity: {
        in: ['body'],
        optional: true,
        isInt: { options: { min: 1 }, errorMessage: 'Quantity must be at least 1!' },
    },
};
