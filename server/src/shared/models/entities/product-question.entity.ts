import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User, Product } from '@/shared/models/entities';

@Entity('ProductQuestion')
export class ProductQuestion {
    @PrimaryGeneratedColumn('uuid')
    question_id: string;

    @Index()
    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id', referencedColumnName: 'product_id' })
    product: Promise<Product>;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;
}
