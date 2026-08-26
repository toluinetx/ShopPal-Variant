import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Order } from '@/shared/models/entities';

export enum TrackingEventStatus {
    ORDER_PLACED = 'order_placed',
    PAYMENT_CONFIRMED = 'payment_confirmed',
    PROCESSING = 'processing',
    PACKED = 'packed',
    SHIPPED = 'shipped',
    OUT_FOR_DELIVERY = 'out_for_delivery',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

@Entity('OrderTracking')
export class OrderTracking {
    @PrimaryGeneratedColumn('uuid')
    tracking_id: string;

    @Index()
    @Column({ type: 'uuid' })
    order_id: string;

    @Column({ type: 'enum', enum: TrackingEventStatus })
    status: TrackingEventStatus;

    @Column({ type: 'text', nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'order_id', referencedColumnName: 'order_id' })
    order: Promise<Order>;
}
