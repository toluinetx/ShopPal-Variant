import { InsertResult, DeleteResult } from 'typeorm';
import { AppDataSource } from '@/shared/db/pg.data-source';
import { Wishlist } from '@/shared/models/relationships';
import { Product } from '@/shared/models/entities';

export const WishlistRepository = AppDataSource.getRepository(Wishlist).extend({
    async getWishlist(user_id: string): Promise<Array<Wishlist & { product: Product }>> {
        const rows = await AppDataSource.createQueryBuilder()
            .select('w')
            .addSelect('product')
            .from(Wishlist, 'w')
            .leftJoinAndSelect('w.product', 'product')
            .where('w.user_id = :user_id', { user_id })
            .orderBy('w.added_at', 'DESC')
            .getMany();
        return rows as Array<Wishlist & { product: Product }>;
    },

    async exists(user_id: string, product_id: string): Promise<boolean> {
        const count = await this.createQueryBuilder('w')
            .where('w.user_id = :user_id AND w.product_id = :product_id', { user_id, product_id })
            .getCount();
        return count > 0;
    },

    async addToWishlist(user_id: string, product_id: string): Promise<InsertResult> {
        return AppDataSource.createQueryBuilder()
            .insert()
            .into(Wishlist)
            .values({ user_id, product_id, added_at: new Date() })
            .orIgnore()
            .execute();
    },

    async removeFromWishlist(user_id: string, product_id: string): Promise<DeleteResult> {
        return AppDataSource.createQueryBuilder()
            .delete()
            .from(Wishlist)
            .where('user_id = :user_id AND product_id = :product_id', { user_id, product_id })
            .execute();
    },

    async clearWishlist(user_id: string): Promise<DeleteResult> {
        return AppDataSource.createQueryBuilder()
            .delete()
            .from(Wishlist)
            .where('user_id = :user_id', { user_id })
            .execute();
    },
});
