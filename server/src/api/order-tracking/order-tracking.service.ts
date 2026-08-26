import { TrackingEventStatus } from '@/shared/models/entities';
import { OrderTrackingRepository } from './order-tracking.repository';
import { emitEvent } from '@/shared/utils/notifier';

export class OrderTrackingService {
    static async listForOrder(order_id: string) {
        return OrderTrackingRepository.listForOrder(order_id);
    }

    static async addEvent(payload: {
        order_id: string;
        status: TrackingEventStatus;
        location?: string;
        message?: string;
    }) {
        const event = await OrderTrackingRepository.addEvent(payload);
        emitEvent({
            type: 'order.tracking_added',
            payload: {
                order_id: payload.order_id,
                status: payload.status,
                location: payload.location,
            },
        });
        return event;
    }
}
