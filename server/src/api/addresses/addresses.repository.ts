import { AppDataSource } from '@/shared/db/pg.data-source';
import { SavedAddress } from '@/shared/models/entities';

export const AddressRepository = AppDataSource.getRepository(SavedAddress).extend({
    async list(user_id: string): Promise<SavedAddress[]> {
        return this.createQueryBuilder('a')
            .where('a.user_id = :user_id', { user_id })
            .orderBy('a.is_default', 'DESC')
            .addOrderBy('a.created_at', 'DESC')
            .getMany();
    },

    async findByIdForUser(address_id: string, user_id: string): Promise<SavedAddress | null> {
        return this.findOne({ where: { address_id, user_id } });
    },

    async create(payload: Partial<SavedAddress>): Promise<SavedAddress> {
        const entity = this.create(payload);
        return this.save(entity as SavedAddress);
    },

    async update(address_id: string, user_id: string, payload: Partial<SavedAddress>) {
        return this.createQueryBuilder()
            .update(SavedAddress)
            .set(payload)
            .where('address_id = :address_id AND user_id = :user_id', { address_id, user_id })
            .execute();
    },

    async delete(address_id: string, user_id: string) {
        return this.createQueryBuilder()
            .delete()
            .from(SavedAddress)
            .where('address_id = :address_id AND user_id = :user_id', { address_id, user_id })
            .execute();
    },

    async clearDefault(user_id: string) {
        return this.createQueryBuilder()
            .update(SavedAddress)
            .set({ is_default: false })
            .where('user_id = :user_id', { user_id })
            .execute();
    },

    async setDefault(address_id: string, user_id: string) {
        return this.createQueryBuilder()
            .update(SavedAddress)
            .set({ is_default: true })
            .where('address_id = :address_id AND user_id = :user_id', { address_id, user_id })
            .execute();
    },
});
