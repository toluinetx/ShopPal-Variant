import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import { useApi } from '@/shared/hooks/useApi.hook';
import { useMessages } from '@/shared/hooks/useMessages.hook';
import type { PaymentMethod } from '@/shared/types/entities.types';
import LoadingAnimation from '@/shared/components/LoadingAnimation';

// SAFETY: the input labelled "Card number" is only used to derive the LAST
// FOUR DIGITS locally. We never send the full PAN to the server.
type FormState = {
    label: string;
    card_number: string;
    brand: string;
    holder_name: string;
    exp_month: string;
    exp_year: string;
    is_default: boolean;
};

const emptyForm: FormState = {
    label: '',
    card_number: '',
    brand: '',
    holder_name: '',
    exp_month: '',
    exp_year: '',
    is_default: false,
};

function detectBrand(cardNumber: string): string {
    const first = cardNumber.replace(/\D/g, '')[0];
    if (first === '4') return 'Visa';
    if (first === '5') return 'Mastercard';
    if (first === '3') return 'Amex';
    if (first === '6') return 'Discover';
    return '';
}

export function PaymentMethodsPage() {
    const { auth } = useAuth();
    const { paymentMethodApi } = useApi();
    const { displayMessage } = useMessages();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        if (!auth?.user) return;
        setLoading(true);
        try {
            const res = await paymentMethodApi.list(auth.user.user_id);
            setMethods(res.methods);
        } catch {
            displayMessage({ message: 'Could not load payment methods', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [auth?.user, paymentMethodApi, displayMessage]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!auth?.user) return;
        const digits = form.card_number.replace(/\D/g, '');
        if (digits.length < 12) {
            displayMessage({ message: 'Please enter a valid card number', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            await paymentMethodApi.create(auth.user.user_id, {
                type: 'card',
                label: form.label || 'Card',
                last_four: digits.slice(-4),
                brand: form.brand || detectBrand(digits),
                holder_name: form.holder_name || undefined,
                exp_month: form.exp_month ? Number(form.exp_month) : undefined,
                exp_year: form.exp_year ? Number(form.exp_year) : undefined,
                is_default: form.is_default,
            });
            setForm(emptyForm);
            displayMessage({ message: 'Payment method saved', type: 'success' });
            await refresh();
        } catch {
            displayMessage({ message: 'Could not save payment method', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        if (!auth?.user) return;
        if (!confirm('Delete this payment method?')) return;
        try {
            await paymentMethodApi.remove(auth.user.user_id, id);
            await refresh();
        } catch {
            displayMessage({ message: 'Could not delete', type: 'error' });
        }
    };

    const setDefault = async (id: string) => {
        if (!auth?.user) return;
        try {
            await paymentMethodApi.setDefault(auth.user.user_id, id);
            await refresh();
        } catch {
            displayMessage({ message: 'Could not set default', type: 'error' });
        }
    };

    if (loading) return <LoadingAnimation />;

    return (
        <main className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8">
            <header>
                <h1 className="text-3xl font-bold">Payment methods</h1>
                <p className="text-sm text-text-700">
                    We only store the last 4 digits and brand of your card — never the full number.
                </p>
            </header>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {methods.length === 0 && (
                    <p className="col-span-full rounded-lg border border-dashed border-primary-200 bg-primary-50 p-6 text-center">
                        No saved payment methods yet.
                    </p>
                )}
                {methods.map((m) => (
                    <article
                        key={m.payment_method_id}
                        className={`flex flex-col gap-2 rounded-lg border p-4 ${m.is_default ? 'border-primary-500 bg-primary-50' : 'border-primary-100 bg-white'}`}
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">{m.label}</h2>
                            {m.is_default && (
                                <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-medium text-white">
                                    Default
                                </span>
                            )}
                        </div>
                        <p className="text-sm">
                            {m.brand ?? 'Card'} •••• {m.last_four ?? '••••'}
                        </p>
                        {m.exp_month && m.exp_year && (
                            <p className="text-xs text-text-700">
                                Expires {String(m.exp_month).padStart(2, '0')}/{m.exp_year}
                            </p>
                        )}
                        <div className="mt-2 flex gap-2">
                            {!m.is_default && (
                                <button
                                    onClick={() => setDefault(m.payment_method_id)}
                                    className="rounded-md border border-primary-300 px-3 py-1 text-xs font-medium hover:bg-primary-50"
                                >
                                    Make default
                                </button>
                            )}
                            <button
                                onClick={() => remove(m.payment_method_id)}
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
                <h2 className="col-span-full text-lg font-bold">Add a card</h2>
                <input
                    required
                    placeholder="Label (e.g. Personal)"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    placeholder="Cardholder name"
                    value={form.holder_name}
                    onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    required
                    placeholder="Card number"
                    value={form.card_number}
                    onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                    inputMode="numeric"
                    className="col-span-full rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    placeholder="Exp. month (MM)"
                    value={form.exp_month}
                    onChange={(e) => setForm({ ...form, exp_month: e.target.value })}
                    inputMode="numeric"
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <input
                    placeholder="Exp. year (YYYY)"
                    value={form.exp_year}
                    onChange={(e) => setForm({ ...form, exp_year: e.target.value })}
                    inputMode="numeric"
                    className="rounded-md border border-primary-200 px-3 py-2"
                />
                <label className="col-span-full flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    />
                    Use as default payment method
                </label>
                <button
                    type="submit"
                    disabled={saving}
                    className="col-span-full rounded-md bg-primary-500 py-2 font-semibold text-white disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save card'}
                </button>
            </form>
        </main>
    );
}
