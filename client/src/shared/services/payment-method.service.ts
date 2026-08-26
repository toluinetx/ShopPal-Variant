import type { PaymentMethod } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export const usePaymentMethodService = ({ PRIVATE_API }: Deps) => {
    const list = useCallback(
        async (userId: string): Promise<{ methods: PaymentMethod[] }> => {
            const res = await PRIVATE_API.get(`/payment-method/${userId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const create = useCallback(
        async (userId: string, payload: Partial<PaymentMethod>): Promise<{ method: PaymentMethod }> => {
            const res = await PRIVATE_API.post(`/payment-method/${userId}`, payload);
            return res.data;
        },
        [PRIVATE_API]
    );

    const remove = useCallback(
        async (userId: string, paymentMethodId: string) => {
            const res = await PRIVATE_API.delete(`/payment-method/${userId}/${paymentMethodId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const setDefault = useCallback(
        async (userId: string, paymentMethodId: string) => {
            const res = await PRIVATE_API.post(
                `/payment-method/${userId}/${paymentMethodId}/set-default`
            );
            return res.data;
        },
        [PRIVATE_API]
    );

    return { list, create, remove, setDefault };
};
