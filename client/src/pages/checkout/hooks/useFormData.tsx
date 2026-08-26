import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import type { SavedAddress, PaymentMethod } from '@/shared/types/entities.types';

const initialFormState = {
    firstName: '',
    middleName: '',
    lastName: '',
    street: '',
    city: '',
    country: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
};


export const useFormData = (fillDetails: boolean) => {
    const [formData, setFormData] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState({} as Partial<typeof initialFormState>);
    const userDetails = useAuth().auth?.user;
    const { addressApi, paymentMethodApi } = useApi();

    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

    // Effect to fill form when checkbox is checked and user details are available
    useEffect(() => {
        if (fillDetails && userDetails) {
            setFormData((prevState) => ({
                ...prevState,
                firstName: userDetails.name_details.first_name || '',
                middleName: userDetails.name_details.middle_name || '',
                lastName: userDetails.name_details.last_name || '',
                street: userDetails.address.street || '',
                city: userDetails.address.city || '',
                country: userDetails.address.country || '',
                email: userDetails.email || '',
                phone: userDetails.phone || '',
            }));
        }
    }, [fillDetails, userDetails]);

    // Fetch saved addresses and payment methods for logged-in users, for the checkout dropdowns.
    useEffect(() => {
        if (!userDetails) return;
        addressApi
            .listAddresses(userDetails.user_id)
            .then((res) => setSavedAddresses(res.addresses))
            .catch(() => setSavedAddresses([]));
        paymentMethodApi
            .list(userDetails.user_id)
            .then((res) => setSavedPaymentMethods(res.methods))
            .catch(() => setSavedPaymentMethods([]));
    }, [userDetails, addressApi, paymentMethodApi]);

    //Handler for form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
        // Clear the error for the field being edited
        setFormErrors((prevErrors) => ({
            ...prevErrors,
            [name]: '',
        }));
    };

    // Pre-fill address fields from a saved address selection.
    const applySavedAddress = useCallback((addressId: string) => {
        const saved = savedAddresses.find((a) => a.address_id === addressId);
        if (!saved) return;
        setFormData((prevState) => ({
            ...prevState,
            country: saved.address.country || '',
            city: saved.address.city || '',
            street: saved.address.street || '',
        }));
    }, [savedAddresses]);

    // Pre-fill card fields from a saved payment method selection.
    const applySavedPaymentMethod = useCallback((paymentMethodId: string) => {
        const saved = savedPaymentMethods.find((m) => m.payment_method_id === paymentMethodId);
        if (!saved) return;
        setSelectedPaymentMethodId(saved.payment_method_id);
        setFormData((prevState) => ({
            ...prevState,
            cardNumber: `**** **** **** ${saved.last_four ?? '****'}`,
        }));
        setFormErrors((prevErrors) => ({ ...prevErrors, cardNumber: '' }));
    }, [savedPaymentMethods]);

    const clearSelectedPaymentMethod = useCallback(() => {
        setSelectedPaymentMethodId(null);
    }, []);

    return {
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
    };
};