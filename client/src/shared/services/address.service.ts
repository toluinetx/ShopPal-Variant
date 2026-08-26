import type { SavedAddress } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export const useAddressService = ({ PRIVATE_API }: Deps) => {
    const listAddresses = useCallback(
        async (userId: string): Promise<{ addresses: SavedAddress[] }> => {
            const res = await PRIVATE_API.get(`/address/${userId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const createAddress = useCallback(
        async (userId: string, payload: Partial<SavedAddress>): Promise<{ address: SavedAddress }> => {
            const res = await PRIVATE_API.post(`/address/${userId}`, payload);
            return res.data;
        },
        [PRIVATE_API]
    );

    const updateAddress = useCallback(
        async (userId: string, addressId: string, payload: Partial<SavedAddress>) => {
            const res = await PRIVATE_API.patch(`/address/${userId}/${addressId}`, payload);
            return res.data;
        },
        [PRIVATE_API]
    );

    const deleteAddress = useCallback(
        async (userId: string, addressId: string) => {
            const res = await PRIVATE_API.delete(`/address/${userId}/${addressId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const setDefaultAddress = useCallback(
        async (userId: string, addressId: string) => {
            const res = await PRIVATE_API.post(`/address/${userId}/${addressId}/set-default`);
            return res.data;
        },
        [PRIVATE_API]
    );

    return { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };
};
