import { Schema } from 'express-validator';
import { TrackingEventStatus } from '@/shared/models/entities';

export const getTrackingSchema: Schema = {
    order_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
    },
};

export const addTrackingEventSchema: Schema = {
    order_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
    },
    status: {
        in: ['body'],
        notEmpty: true,
        isIn: {
            options: [Object.values(TrackingEventStatus)],
            errorMessage: `status must be one of ${Object.values(TrackingEventStatus).join(', ')}`,
        },
    },
    location: { in: ['body'], optional: true },
    message: { in: ['body'], optional: true },
};
