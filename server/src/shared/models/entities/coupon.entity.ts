import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum CouponType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat',
}

@Entity('Coupon')
export class Coupon {
    @PrimaryGeneratedColumn('uuid')
    coupon_id: string;

    // Human-friendly redeemable code (unique).
    @Column({ type: 'text', unique: true })
    code: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: CouponType })
    type: CouponType;

    // For PERCENTAGE, this is 0-100. For FLAT, absolute currency amount.
    @Column({ type: 'real' })
    value: number;

    @Column({ type: 'real', default: 0 })
    min_order_total: number;

    // Optional cap on the discount amount for percentage coupons.
    @Column({ type: 'real', nullable: true })
    max_discount: number;

    @Column({ type: 'integer', nullable: true })
    usage_limit: number;

    @Column({ type: 'integer', default: 0 })
    times_used: number;

    @Column({ type: 'timestamptz', nullable: true })
    valid_from: Date;

    @Column({ type: 'timestamptz', nullable: true })
    valid_until: Date;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;
}
