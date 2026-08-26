import type { ProductQuestion, ProductAnswer } from '@/shared/types/entities.types';
import { useCallback } from 'react';
import type { AxiosInstance } from 'axios';

type Deps = { PRIVATE_API: AxiosInstance; PUBLIC_API: AxiosInstance };

export const useQnaService = ({ PRIVATE_API, PUBLIC_API }: Deps) => {
    const listForProduct = useCallback(
        async (productId: string, limit = 20, offset = 0): Promise<{ questions: ProductQuestion[] }> => {
            const res = await PUBLIC_API.get(`/qna/${productId}`, { params: { limit, offset } });
            return res.data;
        },
        [PUBLIC_API]
    );

    const askQuestion = useCallback(
        async (productId: string, body: string): Promise<{ question: ProductQuestion }> => {
            const res = await PRIVATE_API.post(`/qna/${productId}`, { body });
            return res.data;
        },
        [PRIVATE_API]
    );

    const answerQuestion = useCallback(
        async (questionId: string, body: string): Promise<{ answer: ProductAnswer }> => {
            const res = await PRIVATE_API.post(`/qna/answer/${questionId}`, { body });
            return res.data;
        },
        [PRIVATE_API]
    );

    const deleteQuestion = useCallback(
        async (questionId: string) => {
            const res = await PRIVATE_API.delete(`/qna/${questionId}`);
            return res.data;
        },
        [PRIVATE_API]
    );

    return { listForProduct, askQuestion, answerQuestion, deleteQuestion };
};
