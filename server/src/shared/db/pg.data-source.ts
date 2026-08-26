import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Order } from '@/shared/models/entities/order.entity';
import { Product } from '@/shared/models/entities/product.entity';
import { Review } from '@/shared/models/entities/review.entity';
import { User } from '@/shared/models/entities/user.entity';
import { Admin } from '@/shared/models/entities/admin.entity';
import { SavedAddress } from '@/shared/models/entities/saved-address.entity';
import { PaymentMethod } from '@/shared/models/entities/payment-method.entity';
import { Coupon } from '@/shared/models/entities/coupon.entity';
import { OrderTracking } from '@/shared/models/entities/order-tracking.entity';
import { ProductQuestion } from '@/shared/models/entities/product-question.entity';
import { ProductAnswer } from '@/shared/models/entities/product-answer.entity';
import { RecentlyViewed } from '@/shared/models/entities/recently-viewed.entity';
import { UserNotification } from '@/shared/models/entities/user-notification.entity';
import { OrderUserLink } from '@/shared/models/relationships/order-user-link.relationship';
import { OrderProductLink } from '@/shared/models/relationships/order-product-link.relationship';
import { Cart } from '@/shared/models/relationships/cart.relationship';
import { Wishlist } from '@/shared/models/relationships/wishlist.relationship';

const baseConfig: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DB_CONNECTION_URL,
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [
        Order,
        Product,
        Review,
        User,
        Admin,
        SavedAddress,
        PaymentMethod,
        Coupon,
        OrderTracking,
        ProductQuestion,
        ProductAnswer,
        RecentlyViewed,
        UserNotification,
        OrderUserLink,
        OrderProductLink,
        Cart,
        Wishlist,
    ],
    subscribers: [],
};

export const AppDataSource = new DataSource(baseConfig);
