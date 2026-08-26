import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/home/Home.page.tsx';
import { ProductsPage } from '@/pages/products/Products.page';
import { ProductPage } from '@/pages/product/Product.page';
import { AuthPage } from '@/pages/auth/Auth.page';
import { CartPage } from '@/pages/cart/Cart.page';
import { ProfilePage } from '@/pages/profile/Profile.page';
import { OrderPage } from '@/pages/order/Order.page';
import { NotFoundPage } from '@/pages/not-found/NotFound.page';
import { SupportPage } from '@/pages/support/Support.page';
import { WishlistPage } from '@/pages/wishlist/Wishlist.page';
import { NotificationsPage } from '@/pages/notifications/Notifications.page';
import { AddressesPage } from '@/pages/account/Addresses.page';
import { PaymentMethodsPage } from '@/pages/account/PaymentMethods.page';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { CheckoutPage } from './pages/checkout/Checkout.page';
import { PersistentLogin } from '@/shared/components/PersistentLogin';
import { LayoutWrapper } from './layouts/LayoutWrapper.layout';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LayoutWrapper />}>
                <Route element={<PersistentLogin />}>
                    {/* public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="product/:id" element={<ProductPage />} />
                    <Route path="auth">
                        <Route path="/auth" element={<Navigate to="/auth/login" />} />
                        <Route path="login" element={<AuthPage type="login" />} />
                        <Route path="signup" element={<AuthPage type="signup" />} />
                    </Route>
                    <Route path="cart" element={<CartPage />} />
                    <Route path="checkout" element={<CheckoutPage />} />
                    <Route path="support" element={<SupportPage />} />

                    {/* private routes */}
                    <Route element={<RequireAuth />}>
                        <Route path="profile/:id" element={<ProfilePage />} />
                        <Route path="order/:id" element={<OrderPage />} />
                        <Route path="wishlist" element={<WishlistPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="account/addresses" element={<AddressesPage />} />
                        <Route path="account/payment-methods" element={<PaymentMethodsPage />} />
                    </Route>
                </Route>

                {/* catch all... */}
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
