import type { UserNotification } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance };

export type ListNotificationsResponse = {
    items: UserNotification[];
    unread_count: number;
};

export const useNotificationsService = ({ PRIVATE_API }: Deps) => {
    const list = useCallback(
        async (
            userId: string,
            opts?: { limit?: number; offset?: number; unread_only?: boolean }
        ): Promise<ListNotificationsResponse> => {
            const res = await PRIVATE_API.get(`/notifications/${userId}`, { params: opts });
            return res.data;
        },
        [PRIVATE_API]
    );

    const markRead = useCallback(
        async (userId: string, notificationId: string) => {
            const res = await PRIVATE_API.post(`/notifications/${userId}/${notificationId}/read`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const markAllRead = useCallback(
        async (userId: string) => {
            const res = await PRIVATE_API.post(`/notifications/${userId}/read-all`);
            return res.data;
        },
        [PRIVATE_API]
    );

    const remove = useCallback(
        async (userId: string, notificationId: string) => {
            const res = await PRIVATE_API.delete(`/notifications/${userId}/${notificationId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    return { list, markRead, markAllRead, remove };
};
