import { AppDataSource } from '@/shared/db/pg.data-source';
import { PaymentMethod } from '@/shared/models/entities';

export const PaymentMethodRepository = AppDataSource.getRepository(PaymentMethod).extend({
    async list(user_id: string) {
        return this.createQueryBuilder('p')
            .where('p.user_id = :user_id', { user_id })
            .orderBy('p.is_default', 'DESC')
            .addOrderBy('p.created_at', 'DESC')
            .getMany();
    },

    async findByIdForUser(payment_method_id: string, user_id: string) {
        return this.findOne({ where: { payment_method_id, user_id } });
    },

    async create(payload: Partial<PaymentMethod>) {
        const entity = this.create(payload);
        return this.save(entity as PaymentMethod);
    },

    async delete(payment_method_id: string, user_id: string) {
        return this.createQueryBuilder()
            .delete()
            .from(PaymentMethod)
            .where('payment_method_id = :payment_method_id AND user_id = :user_id', {
                payment_method_id,
                user_id,
            })
            .execute();
    },

    async clearDefault(user_id: string) {
        return this.createQueryBuilder()
            .update(PaymentMethod)
            .set({ is_default: false })
            .where('user_id = :user_id', { user_id })
            .execute();
    },

    async setDefault(payment_method_id: string, user_id: string) {
        return this.createQueryBuilder()
            .update(PaymentMethod)
            .set({ is_default: true })
            .where('payment_method_id = :payment_method_id AND user_id = :user_id', {
                payment_method_id,
                user_id,
            })
            .execute();
    },
});
