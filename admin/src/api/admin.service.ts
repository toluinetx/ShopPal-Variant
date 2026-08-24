import { api } from '@/api/client';
import type { Admin } from '@/types/entities.types';

export type LoginResponse = {
    accessToken: string;
    admin: Admin;
};

export const loginByUsername = async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/admin/loginByUsername', { username, password });
    return response.data;
};

export const loginByEmail = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/admin/loginByEmail', { email, password });
    return response.data;
};

export const refreshSession = async (): Promise<LoginResponse> => {
    const response = await api.get<LoginResponse>('/admin/refresh-token');
    return response.data;
};

export const logout = async (): Promise<void> => {
    await api.post('/admin/logout');
};
