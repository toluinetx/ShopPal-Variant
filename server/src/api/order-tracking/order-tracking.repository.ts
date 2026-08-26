import { AppDataSource } from '@/shared/db/pg.data-source';
import { OrderTracking, TrackingEventStatus } from '@/shared/models/entities';

export const OrderTrackingRepository = AppDataSource.getRepository(OrderTracking).extend({
    async listForOrder(order_id: string): Promise<OrderTracking[]> {
        return this.createQueryBuilder('t')
            .where('t.order_id = :order_id', { order_id })
            .orderBy('t.created_at', 'ASC')
            .getMany();
    },

    async addEvent(payload: {
        order_id: string;
        status: TrackingEventStatus;
        location?: string;
        message?: string;
    }): Promise<OrderTracking> {
        const entity = this.create(payload);
        return this.save(entity as OrderTracking);
    },
});
