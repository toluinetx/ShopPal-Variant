import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/shared/models/entities';
import { Address } from '@/shared/models/composites';
import { PGDataTransformer } from '@/shared/utils/helpers';

@Entity('SavedAddress')
export class SavedAddress {
    @PrimaryGeneratedColumn('uuid')
    address_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'text' })
    label: string;

    @Column({
        type: 'text',
        transformer: {
            from: PGDataTransformer.fromPGCompositeType(Address),
            to: PGDataTransformer.toPGCompositeType(Address),
        },
    })
    address: Address;

    @Column({ type: 'text', nullable: true })
    recipient_name: string;

    @Column({ type: 'text', nullable: true })
    recipient_phone: string;

    @Column({ type: 'boolean', default: false })
    is_default: boolean;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: Promise<User>;
}
