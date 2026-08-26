import type { ResponseError } from '../types/api.types';
import type { Address } from '../types';
import type { Order, OrderDetail, Product } from '@/shared/types/entities.types';
import { OrderStatus } from '@/shared/types/enum.types';
import { useCallback } from 'react';
import { AxiosInstance } from 'axios';

export type GetOrdersResponseProps = Pick<
    Order,
    'order_id' | 'issued_time' | 'order_status' | 'delivery_address' | 'billing_info'
> & {
    products: (Pick<Product, 'product_id' | 'thumbnail' | 'title' | 'price'> & { quantity: number })[];
};

type AddOrderRequestProps = {
    product_ids: string[];
    quantities: number[];
    billing_info: string;
    delivery_address: Address;
    coupon_code?: string;
    payment_method_id?: string;
};

type AddOrderResponse = Order & { subtotal?: number; discount_amount?: number; total?: number };

type useOrderServiceProps = {
    PRIVATE_API: AxiosInstance;
    PUBLIC_API: AxiosInstance;
};

type updateStocksProps = {
    product_ids: string[];
    new_stocks: number[];
};

export const useOrderService = ({ PRIVATE_API, PUBLIC_API }: useOrderServiceProps) => {
    const getUserOrders = useCallback(
        async (userId: string, limit?: number, offset?: number): Promise<GetOrdersResponseProps[] | ResponseError> => {
            const response = await PRIVATE_API.get(`/order/${userId}`, { params: { limit, offset } });
            return response.data;
        },
        [PRIVATE_API]
    );

    const getSingleOrder = useCallback(
        async (orderId: string): Promise<{ order: OrderDetail }> => {
            const response = await PRIVATE_API.get(`/order/single/${orderId}`);
            return response.data;
        },
        [PRIVATE_API]
    );

    const addGuestOrder = useCallback(
        async (orderDetails: AddOrderRequestProps): Promise<AddOrderResponse | ResponseError> => {
            const response = await PUBLIC_API.post('/order/', orderDetails);
            return response.data;
        },
        [PUBLIC_API]
    );

    const addUserOrder = useCallback(
        async (userId: string, orderDetails: AddOrderRequestProps): Promise<AddOrderResponse | ResponseError> => {
            const response = await PRIVATE_API.post(`/order/${userId}`, orderDetails);
            return response.data;
        },
        [PRIVATE_API]
    );

    const updateStocks = useCallback(
        async (updateby: updateStocksProps): Promise<void | ResponseError> => {
            const response = await PUBLIC_API.patch('/order/', updateby);
            return response.data;
        },
        [PUBLIC_API]
    );

    const updateOrder = useCallback(
        async (
            orderId: string,
            userId: string,
            update: { order_status?: OrderStatus; delivery_address?: Address }
        ) => {
            const response = await PRIVATE_API.patch(`/order/${orderId}`, { user_id: userId, ...update });
            return response.data;
        },
        [PRIVATE_API]
    );

    const cancelOrder = useCallback(
        async (orderId: string, userId: string) => {
            const response = await PRIVATE_API.delete(`/order/${orderId}`, { data: { user_id: userId } });
            return response.data;
        },
        [PRIVATE_API]
    );

    // Deep chain: pull all items from a past order back into the current cart.
    const reorder = useCallback(
        async (orderId: string) => {
            const response = await PRIVATE_API.post(`/order/${orderId}/reorder`);
            return response.data;
        },
        [PRIVATE_API]
    );

    return {
        getUserOrders,
        getSingleOrder,
        addGuestOrder,
        addUserOrder,
        updateStocks,
        updateOrder,
        cancelOrder,
        reorder,
    };
};
