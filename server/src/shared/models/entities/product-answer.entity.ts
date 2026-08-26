import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ProductQuestion } from '@/shared/models/entities/product-question.entity';
import { User } from '@/shared/models/entities';

@Entity('ProductAnswer')
export class ProductAnswer {
    @PrimaryGeneratedColumn('uuid')
    answer_id: string;

    @Index()
    @Column({ type: 'uuid' })
    question_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'text' })
    body: string;

    // Marks the answer as coming from a store admin/staff.
    @Column({ type: 'boolean', default: false })
    is_staff: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => ProductQuestion)
    @JoinColumn({ name: 'question_id', referencedColumnName: 'question_id' })
    question: Promise<ProductQuestion>;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;
}
