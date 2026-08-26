import { createContext } from 'react';
import { useAuthService } from '../services/auth.service';
import { useUserService } from '../services/user.service';
import { useProductService } from '../services/product.service';
import { useCartService } from '../services/cart.service';
import { useOrderService } from '../services/order.service';
import { useReviewService } from '../services/review.service';
import { useWishlistService } from '../services/wishlist.service';
import { useAddressService } from '../services/address.service';
import { usePaymentMethodService } from '../services/payment-method.service';
import { useCouponService } from '../services/coupon.service';
import { useTrackingService } from '../services/tracking.service';
import { useQnaService } from '../services/qna.service';
import { useRecentlyViewedService } from '../services/recently-viewed.service';
import { useNotificationsService } from '../services/notifications.service';
import { usePrivateAPI } from '../hooks/usePrivateAPI.hook';
import { usePublicAPI } from '../hooks/usePublicAPI.hook';

type ApiProviderProps = {
    children: React.ReactNode;
};

type ApiProviderValue = {
    authApi: ReturnType<typeof useAuthService>;
    userApi: ReturnType<typeof useUserService>;
    productApi: ReturnType<typeof useProductService>;
    cartApi: ReturnType<typeof useCartService>;
    orderApi: ReturnType<typeof useOrderService>;
    reviewApi: ReturnType<typeof useReviewService>;
    wishlistApi: ReturnType<typeof useWishlistService>;
    addressApi: ReturnType<typeof useAddressService>;
    paymentMethodApi: ReturnType<typeof usePaymentMethodService>;
    couponApi: ReturnType<typeof useCouponService>;
    trackingApi: ReturnType<typeof useTrackingService>;
    qnaApi: ReturnType<typeof useQnaService>;
    recentlyViewedApi: ReturnType<typeof useRecentlyViewedService>;
    notificationsApi: ReturnType<typeof useNotificationsService>;
};

export const ApiContext = createContext<ApiProviderValue | null>(null);

export const ApiProvider = ({ children }: ApiProviderProps) => {
    const PRIVATE_API = usePrivateAPI();
    const PUBLIC_API = usePublicAPI();
    const authApi = useAuthService({ PRIVATE_API });
    const userApi = useUserService({ PRIVATE_API, PUBLIC_API });
    const productApi = useProductService({ PUBLIC_API });
    const cartApi = useCartService({ PRIVATE_API, PUBLIC_API });
    const orderApi = useOrderService({ PRIVATE_API, PUBLIC_API });
    const reviewApi = useReviewService({ PRIVATE_API, PUBLIC_API });
    const wishlistApi = useWishlistService({ PRIVATE_API });
    const addressApi = useAddressService({ PRIVATE_API });
    const paymentMethodApi = usePaymentMethodService({ PRIVATE_API });
    const couponApi = useCouponService({ PRIVATE_API, PUBLIC_API });
    const trackingApi = useTrackingService({ PRIVATE_API });
    const qnaApi = useQnaService({ PRIVATE_API, PUBLIC_API });
    const recentlyViewedApi = useRecentlyViewedService({ PRIVATE_API });
    const notificationsApi = useNotificationsService({ PRIVATE_API });

    return (
        <ApiContext.Provider
            value={{
                authApi,
                userApi,
                productApi,
                cartApi,
                orderApi,
                reviewApi,
                wishlistApi,
                addressApi,
                paymentMethodApi,
                couponApi,
                trackingApi,
                qnaApi,
                recentlyViewedApi,
                notificationsApi,
            }}
        >
            {children}
        </ApiContext.Provider>
    );
};
