import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OrderUserLink, OrderProductLink } from '@/shared/models/relationships';
import { Address } from '@/shared/models/composites';
import { OrderStatus } from '@/shared/types/enums/db.types';
import { PGDataTransformer } from '@/shared/utils/helpers';

@Entity('Order')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    order_id: string;

    @Column({ type: 'date' })
    issued_time: Date;

    @Column({ type: 'enum', enum: OrderStatus })
    order_status: OrderStatus;

    @Column({ type: 'text', nullable: true })
    billing_info: string;

    @Column({
        type: 'text',
        transformer: {
            from: PGDataTransformer.fromPGCompositeType(Address),
            to: PGDataTransformer.toPGCompositeType(Address),
        },
    })
    delivery_address: Address;

    @Column({ type: 'text', nullable: true })
    coupon_code: string;

    @Column({ type: 'real', default: 0 })
    discount_amount: number;

    @Column({ type: 'real', nullable: true })
    subtotal: number;

    @Column({ type: 'real', nullable: true })
    total: number;

    @Column({ type: 'uuid', nullable: true })
    payment_method_id: string;

    @OneToMany(() => OrderUserLink, (orderUserLink) => orderUserLink.order)
    orderUserLinks: Promise<OrderUserLink[]>;

    @OneToMany(() => OrderProductLink, (orderProductLink) => orderProductLink.order)
    orderProductLinks: Promise<OrderProductLink[]>;
}
