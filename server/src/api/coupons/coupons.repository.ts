import { AppDataSource } from '@/shared/db/pg.data-source';
import { Coupon } from '@/shared/models/entities';

export const CouponRepository = AppDataSource.getRepository(Coupon).extend({
    async listActive(): Promise<Coupon[]> {
        return this.createQueryBuilder('c')
            .where('c.active = true')
            .andWhere('(c.valid_from IS NULL OR c.valid_from <= NOW())')
            .andWhere('(c.valid_until IS NULL OR c.valid_until >= NOW())')
            .andWhere('(c.usage_limit IS NULL OR c.times_used < c.usage_limit)')
            .orderBy('c.created_at', 'DESC')
            .getMany();
    },

    async findByCode(code: string): Promise<Coupon | null> {
        return this.findOne({ where: { code: code.toUpperCase() } });
    },

    async create(payload: Partial<Coupon>): Promise<Coupon> {
        const entity = this.create(payload);
        return this.save(entity as Coupon);
    },

    async incrementUsage(code: string) {
        return this.createQueryBuilder()
            .update(Coupon)
            .set({ times_used: () => 'times_used + 1' })
            .where('code = :code', { code: code.toUpperCase() })
            .execute();
    },
});
