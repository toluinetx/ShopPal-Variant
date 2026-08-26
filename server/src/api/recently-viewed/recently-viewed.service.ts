import { RecentlyViewedRepository } from './recently-viewed.repository';

const KEEP_PER_USER = 30;

export class RecentlyViewedService {
    static async list(user_id: string, limit: number) {
        const rows = await RecentlyViewedRepository.list(user_id, limit);
        return rows.map((r: any) => ({
            product_id: r.product_id,
            viewed_at: r.viewed_at,
            product: {
                product_id: r.p_product_id,
                title: r.p_title,
                price: r.p_price,
                thumbnail: r.p_thumbnail,
                rating: r.p_rating,
                category: r.p_category,
                stock: r.p_stock,
                brand: r.p_brand,
            },
        }));
    }

    static async record(user_id: string, product_id: string) {
        await RecentlyViewedRepository.record(user_id, product_id);
        await RecentlyViewedRepository.trimOldest(user_id, KEEP_PER_USER);
    }
}
