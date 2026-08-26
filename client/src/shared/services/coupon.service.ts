import type { Coupon, ValidateCouponResult } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance; PUBLIC_API: AxiosInstance };

export const useCouponService = ({ PRIVATE_API, PUBLIC_API }: Deps) => {
    const list = useCallback(async (): Promise<{ coupons: Coupon[] }> => {
        const res = await PUBLIC_API.get('/coupon');
        return res.data;
    }, [PUBLIC_API]);

    const validate = useCallback(
        async (code: string, subtotal: number): Promise<ValidateCouponResult> => {
            const res = await PUBLIC_API.post('/coupon/validate', { code, subtotal });
            return res.data;
        },
        [PUBLIC_API]
    );

    const apply = useCallback(
        async (code: string, subtotal: number): Promise<ValidateCouponResult> => {
            const res = await PRIVATE_API.post('/coupon/apply', { code, subtotal });
            return res.data;
        },
        [PRIVATE_API]
    );

    return { list, validate, apply };
};
