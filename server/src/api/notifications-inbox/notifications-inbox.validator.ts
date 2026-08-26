import { Schema } from 'express-validator';

const userIdMatchesJwt: Schema[string] = {
    in: ['params'],
    notEmpty: { errorMessage: 'User ID is required!' },
    custom: {
        options: (value, { req }) => value === req.jwtDecodedPayload?.user_id,
        errorMessage: 'User ID does not match the logged-in user ID',
    },
};

export const listNotificationsSchema: Schema = {
    user_id: userIdMatchesJwt,
    limit: { in: ['query'], optional: true, isInt: { options: { min: 1, max: 100 } }, toInt: true },
    offset: { in: ['query'], optional: true, isInt: { options: { min: 0 } }, toInt: true },
    unread_only: { in: ['query'], optional: true, isBoolean: true, toBoolean: true },
};

export const markReadSchema: Schema = {
    user_id: userIdMatchesJwt,
    notification_id: { in: ['params'], notEmpty: true, isUUID: true },
};

export const markAllReadSchema: Schema = { user_id: userIdMatchesJwt };
