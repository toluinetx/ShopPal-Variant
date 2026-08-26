import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { SavedAddress } from '@/shared/types/entities.types';
import LoadingAnimation from '@/shared/components/LoadingAnimation';

type FormState = {
    label: string;
    country: string;
    city: string;
    street: string;
    recipient_name: string;
    recipient_phone: string;
    is_default: boolean;
};

const emptyForm: FormState = {
    label: '',
    country: '',
    city: '',
    street: '',
    recipient_name: '',
    recipient_phone: '',
    is_default: false,
};

export function AddressesPage() {
    const { auth } = useAuth();
    const { addressApi } = useApi();
    const { displayMessage } = useMessages();
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        if (!auth?.user) return;
        setLoading(true);
        try {
            const res = await addressApi.listAddresses(auth.user.user_id);
            setAddresses(res.addresses);
        } catch {
            displayMessage({ message: 'Could not load addresses', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [auth?.user, addressApi, displayMessage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!auth?.user) return;
        setSaving(true);
        try {
            await addressApi.createAddress(auth.user.user_id, {
                label: form.label,
                address: { country: form.country, city: form.city, street: form.street },
                recipient_name: form.recipient_name || undefined,
                recipient_phone: form.recipient_phone || undefined,
                is_default: form.is_default,
            });
            setForm(emptyForm);
            displayMessage({ message: 'Address saved', type: 'success' });
            await refresh();
        } catch {
            displayMessage({ message: 'Could not save address', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        if (!auth?.user) return;
        if (!confirm('Delete this address?')) return;
        try {
            await addressApi.deleteAddress(auth.user.user_id, id);
            await refresh();
        } catch {
            displayMessage({ message: 'Could not delete address', type: 'error' });
        }
    };

    const setDefault = async (id: string) => {
        if (!auth?.user) return;
        try {
            await addressApi.setDefaultAddress(auth.user.user_id, id);
            await refresh();
        } catch {
            displayMessage({ message: 'Could not set default', type: 'error' });
        }
    };

    if (loading) return <LoadingAnimation />;

    return (
        <main className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8">
            <header>
                <h1 className="text-3xl font-bold">Address book</h1>
                <p className="text-sm text-text-700">Saved addresses for faster checkout.</p>
            </header>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addresses.length === 0 && (
                    <p className="col-span-full rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
                        No saved addresses yet.
                    </p>
                )}
                {addresses.map((a) => (
                    <article
                        key={a.address_id}
                        className={`flex flex-col gap-2 rounded-lg border p-4 ${a.is_default ? 'border-primary-500 bg-primary-50' : 'border-primary-100 bg-white'}`}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">{a.label}</h2>
                            {a.is_default && (
                                <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-medium text-white">
                                    Default
                                </span>
                            )}
                        </div>
                        <p className="text-sm">
                            {a.address.street}, {a.address.city}, {a.address.country}
                        </p>
                        {a.recipient_name && (
                            <p className="text-xs text-text-700">
                                {a.recipient_name}
                                {a.recipient_phone ? ` · ${a.recipient_phone}` : ''}
                            </p>
                        )}
                        <div className="mt-2 flex gap-2">
                            {!a.is_default && (
                                <button
                                    onClick={() => setDefault(a.address_id)}
                                    className="rounded-md border border-primary-300 px-3 py-1 text-xs font-medium hover:bg-primary-50"
                                >
                                    Make default
                                </button>
                            )}
                            <button
                                onClick={() => remove(a.address_id)}
                                className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                ))}
            </section>

            <form
                onSubmit={submit}
                className="grid grid-cols-1 gap-3 rounded-lg border border-primary-100 bg-white p-6 md:grid-cols-2"
            >
                <h2 className="col-span-full text-lg font-bold">Add a new address</h2>
                <input
                    required
                    placeholder="Label (e.g. Home)"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    required
                    placeholder="Recipient name"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    required
                    placeholder="Street"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className="col-span-full rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    required
                    placeholder="Country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    placeholder="Recipient phone"
                    value={form.recipient_phone}
                    onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                    className="col-span-full rounded-md border border-primary-200 px-3 py-2"
                />
                <label className="col-span-full flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    />
                    Make this my default address
                </label>
                <button
                    type="submit"
                    disabled={saving}
                    className="col-span-full rounded-md bg-primary-500 py-2 font-semibold text-white disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save address'}
                </button>
            </form>
        </main>
    );
}
