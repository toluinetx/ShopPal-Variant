import { AppDataSource } from '@/shared/db/pg.data-source';
import { RecentlyViewed, Product } from '@/shared/models/entities';

export const RecentlyViewedRepository = AppDataSource.getRepository(RecentlyViewed).extend({
    async list(user_id: string, limit: number) {
        return this.createQueryBuilder('rv')
            .innerJoin(Product, 'p', 'p.product_id = rv.product_id')
            .select([
                'rv.product_id AS product_id',
                'rv.viewed_at AS viewed_at',
                'p.product_id AS p_product_id',
                'p.title AS p_title',
                'p.price AS p_price',
                'p.thumbnail AS p_thumbnail',
                'p.rating AS p_rating',
                'p.category AS p_category',
                'p.stock AS p_stock',
                'p.brand AS p_brand',
            ])
            .where('rv.user_id = :user_id', { user_id })
            .orderBy('rv.viewed_at', 'DESC')
            .limit(limit)
            .getRawMany();
    },

    async record(user_id: string, product_id: string) {
        // Upsert on (user_id, product_id) – TypeORM builder doesn't easily do
        // ON CONFLICT DO UPDATE for composite keys w/ query builder, so use
        // a raw query.
        return AppDataSource.query(
            `INSERT INTO "RecentlyViewed" (user_id, product_id, viewed_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET viewed_at = NOW()`,
            [user_id, product_id]
        );
    },

    async trimOldest(user_id: string, keep: number) {
        // Keep the N most recent per user; delete the rest.
        return AppDataSource.query(
            `DELETE FROM "RecentlyViewed" rv
             WHERE rv.user_id = $1
               AND rv.product_id NOT IN (
                 SELECT product_id FROM "RecentlyViewed"
                 WHERE user_id = $1
                 ORDER BY viewed_at DESC
                 LIMIT $2
               )`,
            [user_id, keep]
        );
    },
});
