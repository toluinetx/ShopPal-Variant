import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/shared/models/entities';

@Entity('PaymentMethod')
export class PaymentMethod {
    @PrimaryGeneratedColumn('uuid')
    payment_method_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    // e.g. 'card', 'paypal'
    @Column({ type: 'text' })
    type: string;

    @Column({ type: 'text' })
    label: string;

    // Only last 4 digits ever stored – no PAN, no CVV.
    @Column({ type: 'text', nullable: true })
    last_four: string;

    @Column({ type: 'text', nullable: true })
    brand: string;

    @Column({ type: 'text', nullable: true })
    holder_name: string;

    @Column({ type: 'integer', nullable: true })
    exp_month: number;

    @Column({ type: 'integer', nullable: true })
    exp_year: number;

    @Column({ type: 'boolean', default: false })
    is_default: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;
}
