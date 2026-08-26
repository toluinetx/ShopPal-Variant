import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/shared/models/entities';

export enum NotificationType {
    ORDER_PLACED = 'order_placed',
    ORDER_STATUS_CHANGED = 'order_status_changed',
    ORDER_CANCELLED = 'order_cancelled',
    WISHLIST_PRICE_DROP = 'wishlist_price_drop',
    WISHLIST_BACK_IN_STOCK = 'wishlist_back_in_stock',
    QUESTION_ANSWERED = 'question_answered',
    COUPON_ISSUED = 'coupon_issued',
    REVIEW_REPLY = 'review_reply',
    GENERAL = 'general',
}

@Entity('UserNotification')
export class UserNotification {
    @PrimaryGeneratedColumn('uuid')
    notification_id: string;

    @Index()
    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    body: string;

    // JSON string – lightweight payload for the client (order_id, product_id, etc.)
    @Column({ type: 'text', nullable: true })
    metadata: string;

    @Column({ type: 'text', nullable: true })
    action_url: string;

    @Column({ type: 'boolean', default: false })
    is_read: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;
}
