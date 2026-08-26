import { Request, Response, NextFunction } from 'express';
import { OrderService } from '@/api/orders/order.service';
import { HttpStatusCode } from '@/shared/types/enums/httpcode.types';
import {
    GetOrdersRequestProps,
    CreateOrderForGuestUserProps,
    CreateOrderForAuthenticatedUserProps,
    UpdateOrderProps,
    DeleteOrderProps,
} from '@/api/orders/order.types';
import { In } from 'typeorm';
import { AppDataSource } from '@/shared/db/pg.data-source';
import { Product, NotificationType } from '@/shared/models/entities';
import { CouponService } from '@/api/coupons/coupons.service';
import { NotificationService } from '@/api/notifications-inbox/notifications-inbox.service';
import { emitEvent } from '@/shared/utils/notifier';

export class OrderController {
    public static async getOrders(req: Request, res: Response, next: NextFunction) {
        const getOrdersRequest = {
            user_id: req.params.user_id,
            limit: Number((req.query as any).limit ?? 10),
            offset: Number((req.query as any).offset ?? 0),
        } as GetOrdersRequestProps;
        const orders = await OrderService.getOrders(getOrdersRequest);
        res.status(HttpStatusCode.OK).json(orders);
    }

    // Deep chain: single-order view for the /order/:id page.
    public static async getSingleOrder(req: Request, res: Response) {
        const user_id = req.jwtDecodedPayload!.user_id;
        const order = await OrderService.getSingleOrder(req.params.order_id, user_id);
        res.status(HttpStatusCode.OK).json({ order });
    }

    public static async createOrderForGuestUser(req: Request, res: Response, next: NextFunction) {
        const { product_ids, quantities, billing_info, delivery_address, coupon_code } =
            req.body as CreateOrderForGuestUserProps;
        const issued_time = new Date();
        const { subtotal, discount_amount, total } = await OrderController.priceOrder(
            product_ids,
            quantities,
            coupon_code
        );
        const createdOrder = await OrderService.createNewOrder({
            issued_time,
            billing_info,
            delivery_address,
            coupon_code,
            discount_amount,
            subtotal,
            total,
        } as any);
        await OrderService.createOrderProductLinks(createdOrder.order_id, product_ids, quantities);
        await OrderService.seedInitialTracking(createdOrder.order_id);
        emitEvent({ type: 'order.created', payload: { order_id: createdOrder.order_id, guest: true } });
        res.status(HttpStatusCode.CREATED).json(createdOrder);
    }

    public static async createOrderForAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
        const {
            user_id,
            product_ids,
            quantities,
            billing_info,
            delivery_address,
            coupon_code,
            payment_method_id,
        } = req.body as CreateOrderForAuthenticatedUserProps;
        const issued_time = new Date();
        const { subtotal, discount_amount, total } = await OrderController.priceOrder(
            product_ids,
            quantities,
            coupon_code
        );
        const createdOrder = await OrderService.createNewOrder({
            issued_time,
            billing_info,
            delivery_address,
            coupon_code,
            discount_amount,
            subtotal,
            total,
            payment_method_id,
        } as any);
        await OrderService.createOrderProductLinks(createdOrder.order_id, product_ids, quantities);
        await OrderService.createOrderUserLink(createdOrder.order_id, user_id);
        await OrderService.seedInitialTracking(createdOrder.order_id);

        // Deep chain: drop a receipt into the user's notification inbox.
        await NotificationService.createForUser({
            user_id,
            type: NotificationType.ORDER_PLACED,
            title: `Order placed \u2013 $${(total ?? 0).toFixed(2)}`,
            body: `Your order of ${product_ids.length} item${product_ids.length === 1 ? '' : 's'} was placed successfully.`,
            metadata: JSON.stringify({ order_id: createdOrder.order_id, total }),
            action_url: `/order/${createdOrder.order_id}`,
        });

        emitEvent({
            type: 'order.created',
            payload: { order_id: createdOrder.order_id, user_id, total },
        });

        res.status(HttpStatusCode.CREATED).json({ ...createdOrder, subtotal, discount_amount, total });
    }

    public static async updateOrder(req: Request, res: Response, next: NextFunction) {
        const order_id = req.params.order_id;
        const { user_id, order_status, delivery_address } = req.body as UpdateOrderProps;
        await OrderService.ensureThereAreValuesToUpdateWith({ order_status, delivery_address });
        await OrderService.ensureOrderBelongsToUser(order_id, user_id);
        await OrderService.updateOrder(order_id, { order_status, delivery_address });

        if (order_status) {
            await NotificationService.createForUser({
                user_id,
                type: NotificationType.ORDER_STATUS_CHANGED,
                title: `Order status: ${order_status}`,
                body: `Your order status was updated to "${order_status}".`,
                metadata: JSON.stringify({ order_id, order_status }),
                action_url: `/order/${order_id}`,
            });
        }

        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    public static async deleteOrder(req: Request, res: Response, next: NextFunction) {
        const order_id = req.params.order_id;
        const { user_id } = req.body as DeleteOrderProps;
        await OrderService.ensureOrderBelongsToUser(order_id, user_id);
        await OrderService.ensureOrderWasRecentlyPurchased(order_id);
        await OrderService.recordCancellation(order_id);
        await OrderService.deleteOrder(order_id);

        await NotificationService.createForUser({
            user_id,
            type: NotificationType.ORDER_CANCELLED,
            title: 'Order cancelled',
            body: 'Your order has been cancelled.',
            metadata: JSON.stringify({ order_id }),
        });

        emitEvent({ type: 'order.cancelled', payload: { order_id, user_id } });
        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    public static async updateProductsStocks(req: Request, res: Response, next: NextFunction) {
        const product_ids = req.body.product_ids;
        const new_stocks = req.body.new_stocks;
        await OrderService.updateProductsStock(product_ids, new_stocks);
        res.status(HttpStatusCode.NO_CONTENT).send();
    }

    // Deep chain: refill the current user's cart from a past order.
    public static async reorder(req: Request, res: Response) {
        const user_id = req.jwtDecodedPayload!.user_id;
        const items = await OrderService.reorderToCart(req.params.order_id, user_id);
        res.status(HttpStatusCode.OK).json({ message: 'Items added back to your cart', items });
    }

    // Helper – prices an order server-side. Never trusts a client-supplied total.
    private static async priceOrder(product_ids: string[], quantities: number[], coupon_code?: string) {
        const products = product_ids.length
            ? await AppDataSource.getRepository(Product).find({ where: { product_id: In(product_ids) } })
            : [];
        let subtotal = 0;
        for (let i = 0; i < product_ids.length; i++) {
            const p = products.find((pp) => pp.product_id === product_ids[i]);
            if (p) subtotal += (p.price ?? 0) * (quantities[i] ?? 0);
        }
        subtotal = Math.round(subtotal * 100) / 100;

        let discount_amount = 0;
        if (coupon_code) {
            const result = await CouponService.apply(coupon_code, subtotal);
            discount_amount = result.discount ?? 0;
        }
        const total = Math.max(0, Math.round((subtotal - discount_amount) * 100) / 100);
        return { subtotal, discount_amount, total };
    }
}
