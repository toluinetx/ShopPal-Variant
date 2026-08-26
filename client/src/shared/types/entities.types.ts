import { Gender, Category, OrderStatus } from '@/shared/types/enum.types';
import { Address, NameDetails, Dimension } from '@/shared/types/composite.types';

export type User = {
    user_id: string;
    email: string;
    username: string;
    password: string;
    name_details: NameDetails;
    gender: Gender;
    phone?: string;
    birthday?: Date;
    avatar?: string;
    address: Address;
};

export type Admin = {
    admin_since: Date;
} & User;

export type Product = {
    product_id: string;
    title: string;
    description?: string;
    price: number;
    rating: number;
    thumbnail?: string;
    images?: string[];
    category: Category;
    stock: number;
    brand?: string;
    return_policy?: string;
    shipping_info?: string;
    warranty_info?: string;
    dimension?: Dimension;
};

export type Review = {
    product_id: string;
    user_id: string;
    rating: number;
    comment: string;
    date: Date;
};

export type Order = {
    order_id: string;
    issued_time: Date;
    order_status: OrderStatus;
    billing_info?: string;
    delivery_address: Address;
    coupon_code?: string;
    discount_amount?: number;
    subtotal?: number;
    total?: number;
    payment_method_id?: string;
};

export type CartItem = {
    user_id: string;
    product_id: string;
    quantity: number;
    __product__: Product;
};

export type Cart = CartItem[];
export type GuestCart = { product_ids: string[]; quantities: number[] };
export type ReviewsWithAuthor = (Omit<Review, 'user_id'> & { author: Pick<User, 'user_id' | 'username' | 'avatar'> })[];

export type WishlistItem = {
    user_id: string;
    product_id: string;
    added_at: string;
    __product__: Product;
};

export type SavedAddress = {
    address_id: string;
    user_id: string;
    label: string;
    address: Address;
    recipient_name?: string;
    recipient_phone?: string;
    is_default: boolean;
    created_at: string;
};

export type PaymentMethod = {
    payment_method_id: string;
    user_id: string;
    type: 'card' | 'paypal' | string;
    label: string;
    last_four?: string;
    brand?: string;
    holder_name?: string;
    exp_month?: number;
    exp_year?: number;
    is_default: boolean;
    created_at: string;
};

export type Coupon = {
    coupon_id: string;
    code: string;
    description?: string;
    type: 'percentage' | 'flat';
    value: number;
    min_order_total: number;
    max_discount?: number;
    usage_limit?: number;
    times_used: number;
    valid_from?: string;
    valid_until?: string;
    active: boolean;
    created_at: string;
};

export type ValidateCouponResult = {
    valid: boolean;
    reason?: string;
    coupon?: Coupon;
    discount?: number;
    total_after_discount?: number;
};

export type TrackingEventStatus =
    | 'order_placed'
    | 'payment_confirmed'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';

export type OrderTrackingEvent = {
    tracking_id: string;
    order_id: string;
    status: TrackingEventStatus;
    location?: string;
    message?: string;
    created_at: string;
};

export type OrderDetail = Order & {
    products: Array<{
        product_id: string;
        quantity: number;
        title: string;
        thumbnail?: string;
        price: number;
        brand?: string;
    }>;
};

export type ProductQuestion = {
    question_id: string;
    product_id: string;
    body: string;
    created_at: string;
    author: { user_id: string; username: string; avatar: string | null };
    answers: ProductAnswer[];
};

export type ProductAnswer = {
    answer_id: string;
    body: string;
    created_at: string;
    is_staff: boolean;
    author: { user_id: string; username: string; avatar: string | null };
};

export type RecentlyViewedItem = {
    product_id: string;
    viewed_at: string;
    product: Pick<Product, 'product_id' | 'title' | 'price' | 'thumbnail' | 'rating' | 'category' | 'stock' | 'brand'>;
};

export type NotificationType =
    | 'order_placed'
    | 'order_status_changed'
    | 'order_cancelled'
    | 'wishlist_price_drop'
    | 'wishlist_back_in_stock'
    | 'question_answered'
    | 'coupon_issued'
    | 'review_reply'
    | 'general';

export type UserNotification = {
    notification_id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: string;
    action_url?: string;
    is_read: boolean;
    created_at: string;
};
