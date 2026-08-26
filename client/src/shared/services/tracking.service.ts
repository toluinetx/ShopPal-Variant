import type { OrderTrackingEvent } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export const useTrackingService = ({ PRIVATE_API }: Deps) => {
    const getTracking = useCallback(
        async (orderId: string): Promise<{ events: OrderTrackingEvent[] }> => {
            const res = await PRIVATE_API.get(`/tracking/${orderId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    return { getTracking };
};
