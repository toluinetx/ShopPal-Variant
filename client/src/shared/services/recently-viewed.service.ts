import type { RecentlyViewedItem } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export const useRecentlyViewedService = ({ PRIVATE_API }: Deps) => {
    const list = useCallback(
        async (userId: string, limit = 12): Promise<{ items: RecentlyViewedItem[] }> => {
            const res = await PRIVATE_API.get(`/recently-viewed/${userId}`, { params: { limit } });
            return res.data;
        },
        [PRIVATE_API]
    );

    const record = useCallback(
        async (userId: string, productId: string) => {
            const res = await PRIVATE_API.post(`/recently-viewed/${userId}`, { product_id: productId });
            return res.data;
        },
        [PRIVATE_API]
    );

    return { list, record };
};
