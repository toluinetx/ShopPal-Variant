import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User, Product } from '@/shared/models/entities';

@Entity('RecentlyViewed')
export class RecentlyViewed {
    @PrimaryColumn('uuid')
    user_id: string;

    @PrimaryColumn('uuid')
    product_id: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    viewed_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id', referencedColumnName: 'product_id' })
    product: Promise<Product>;
}
