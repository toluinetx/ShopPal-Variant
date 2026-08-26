import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import LoadingAnimation from '@/shared/components/LoadingAnimation';
import OrderSuccess from './components/OrderSuccess';
import CheckoutForm from './components/CheckoutForm';
import CartTable from './components/CartTable';
import { CouponSection } from './components/CouponSection';
import { useFormData } from './hooks/useFormData';
import { useOrderHandlers } from './hooks/useOrderHandling';
import { ProductDetails } from './types/ProductDetails';

export function CheckoutPage() {
    const location = useLocation();
    const { itemsInCart } = location.state || { itemsInCart: [] };
    const totalQuantity = itemsInCart.reduce((total: number, item: ProductDetails) => total + item.quantity, 0);
    const subtotalNum = itemsInCart.reduce(
        (total: number, item: ProductDetails) => total + parseFloat(item.price) * item.quantity,
        0
    );
    const totalPrice = subtotalNum.toFixed(2);

    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [discount, setDiscount] = useState<number>(0);
    const [fillDetails, setFillDetails] = useState(false);
    const {
        formData,
        setFormData,
        formErrors,
        setFormErrors,
        handleChange,
        savedAddresses,
        applySavedAddress,
        savedPaymentMethods,
        selectedPaymentMethodId,
        applySavedPaymentMethod,
        clearSelectedPaymentMethod,
    } = useFormData(fillDetails);
    const {
        showBillingInfo,
        orderSuccess,
        orderId,
        isLoading,
        handleOrder,
        handleContinue,
    } = useOrderHandlers(
        itemsInCart,
        formData,
        setFormErrors,
        couponCode ?? undefined,
        selectedPaymentMethodId ?? undefined
    );

    const grandTotal = Math.max(0, subtotalNum - discount).toFixed(2);

    return (
        <main className="container relative flex flex-1 flex-row justify-between tablet-lg:gap-4 tablet-md:flex-col-reverse">
            {orderSuccess ? (
                <OrderSuccess orderId={orderId} />
            ) : (
                <>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                            <LoadingAnimation />
                        </div>
                    )}
                    <section className="pl-2 w-full max-w-[40%] pc-sm:w-1/2 tablet-lg:max-w-[50%] tablet-md:w-full tablet-md:max-w-full mobile-lg:px-3">
                        <CheckoutForm
                            formData={formData}
                            formErrors={formErrors}
                            handleChange={handleChange}
                            handleContinue={handleContinue}
                            showBillingInfo={showBillingInfo}
                            fillDetails={fillDetails}
                            setFillDetails={setFillDetails}
                            setFormData={setFormData}
                            handleOrder={handleOrder}
                            savedAddresses={savedAddresses}
                            onSelectSavedAddress={applySavedAddress}
                            savedPaymentMethods={savedPaymentMethods}
                            selectedPaymentMethodId={selectedPaymentMethodId}
                            onSelectSavedPaymentMethod={applySavedPaymentMethod}
                            onClearSavedPaymentMethod={clearSelectedPaymentMethod}
                        />
                    </section>
                    <aside className="my-3 flex flex-col gap-6">
                        <h1 className="text-4xl">Order summary</h1>
                        <section className="h-full border-l border-accent-300 bg-accent-100 pr-7 tablet-md:ml-0 tablet-md:mt-0 tablet-md:w-full">
                            <CartTable
                                itemsInCart={itemsInCart}
                                totalQuantity={totalQuantity}
                                totalPrice={totalPrice}
                            />
                            <div className="mt-4 flex flex-col gap-2 pl-3">
                                <CouponSection
                                    subtotal={subtotalNum}
                                    couponCode={couponCode}
                                    setCouponCode={setCouponCode}
                                    discount={discount}
                                    setDiscount={setDiscount}
                                />
                                {discount > 0 && (
                                    <div className="flex justify-between text-sm text-green-700">
                                        <span>Discount</span>
                                        <span>-${discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-primary-200 pt-2 text-lg font-bold">
                                    <span>You pay</span>
                                    <span>${grandTotal}</span>
                                </div>
                            </div>
                        </section>
                    </aside>
                </>
            )}
        </main>
    );
}
