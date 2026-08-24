import { api } from '@/api/client';
import type { Product, ProductInput } from '@/types/entities.types';

export type GetProductsParams = {
    limit: number;
    offset: number;
    title?: string;
    sortBy?: 'title' | 'price' | 'rating' | 'stock' | 'brand';
    order?: 'asc' | 'desc';
};

export const getProducts = async (params: GetProductsParams): Promise<Product[]> => {
    const response = await api.get<{ products: Product[] }>('/product/', { params });
    return response.data.products;
};

export const createProduct = async (product: ProductInput): Promise<Product> => {
    const response = await api.post<{ product: Product }>('/product/', product);
    return response.data.product;
};

export const updateProduct = async (product_id: string, product: Partial<ProductInput>): Promise<Partial<Product>> => {
    const response = await api.patch<{ product: Partial<Product> }>(`/product/${product_id}`, product);
    return response.data.product;
};

export const deleteProduct = async (product_id: string): Promise<void> => {
    await api.delete(`/product/${product_id}`);
};
