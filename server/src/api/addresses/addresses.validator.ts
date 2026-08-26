import { Schema } from 'express-validator';

const userIdMatchesJwt: Schema[string] = {
    in: ['params'],
    notEmpty: { errorMessage: 'User ID is required!' },
    custom: {
        options: (value, { req }) => value === req.jwtDecodedPayload?.user_id,
        errorMessage: 'User ID does not match the logged-in user ID',
    },
};

export const listAddressesSchema: Schema = {
    user_id: userIdMatchesJwt,
};

const addressBodyFields: Schema = {
    label: {
        in: ['body'],
        notEmpty: { errorMessage: 'label is required' },
        isLength: { options: { max: 60 } },
    },
    'address.country': { in: ['body'], notEmpty: { errorMessage: 'address.country is required' } },
    'address.city': { in: ['body'], notEmpty: { errorMessage: 'address.city is required' } },
    'address.street': { in: ['body'], notEmpty: { errorMessage: 'address.street is required' } },
    recipient_name: { in: ['body'], optional: true },
    recipient_phone: { in: ['body'], optional: true },
    is_default: { in: ['body'], optional: true, isBoolean: true },
};

export const createAddressSchema: Schema = {
    user_id: userIdMatchesJwt,
    ...addressBodyFields,
};

export const updateAddressSchema: Schema = {
    user_id: userIdMatchesJwt,
    address_id: {
        in: ['params'],
        notEmpty: { errorMessage: 'address_id is required' },
        isUUID: true,
    },
    label: { in: ['body'], optional: true, isLength: { options: { max: 60 } } },
    'address.country': { in: ['body'], optional: true },
    'address.city': { in: ['body'], optional: true },
    'address.street': { in: ['body'], optional: true },
    recipient_name: { in: ['body'], optional: true },
    recipient_phone: { in: ['body'], optional: true },
    is_default: { in: ['body'], optional: true, isBoolean: true },
};

export const deleteAddressSchema: Schema = {
    user_id: userIdMatchesJwt,
    address_id: {
        in: ['params'],
        notEmpty: { errorMessage: 'address_id is required' },
        isUUID: true,
    },
};

export const setDefaultAddressSchema: Schema = deleteAddressSchema;
