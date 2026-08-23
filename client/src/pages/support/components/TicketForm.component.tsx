import { useEffect, useState } from 'react';
import { useSupportApi } from '@/pages/support/hooks/useSupportApi.hook';
import { useAuth } from '@/shared/hooks/useAuth.hook';
import type { CreateTicketPayload, TicketPriority } from '@/pages/support/types';

type Props = {
    onCreated?: () => void;
};

const PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

export function TicketForm({ onCreated }: Props) {
    const supportApi = useSupportApi();
    const { auth } = useAuth();
    const [categories, setCategories] = useState<string[]>([]);
    const [form, setForm] = useState<CreateTicketPayload>({
        user_id: auth?.user?.user_id ?? 'guest',
        email: auth?.user?.email ?? '',
        subject: '',
        category: 'other',
        priority: 'normal',
        body: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        supportApi
            .listCategories()
            .then(setCategories)
            .catch(() => setCategories(['order_issue', 'shipping', 'account', 'other']));
    }, [supportApi]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSubmitting(true);
        try {
            const ticket = await supportApi.createTicket(form);
            setSuccess(`Ticket #${ticket.id.slice(0, 8)} created`);
            setForm((f) => ({ ...f, subject: '', body: '' }));
            onCreated?.();
        } catch (err: any) {
            setError(err?.response?.data?.error ?? 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-solid border-primary-950 bg-background-50 p-6"
        >
            <h2 className="text-2xl font-semibold">Contact support</h2>

            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Email</span>
                <input
                    className="rounded border border-solid border-text-950 bg-white px-3 py-2"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                />
            </label>

            <div className="grid grid-cols-1 gap-4 tablet-sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Category</span>
                    <select
                        className="rounded border border-solid border-text-950 bg-white px-3 py-2"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Priority</span>
                    <select
                        className="rounded border border-solid border-text-950 bg-white px-3 py-2"
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                    >
                        {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Related order ID (optional)</span>
                <input
                    className="rounded border border-solid border-text-950 bg-white px-3 py-2"
                    name="order_id"
                    value={form.order_id ?? ''}
                    onChange={handleChange}
                    placeholder="e.g. 4a12..."
                />
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Subject</span>
                <input
                    className="rounded border border-solid border-text-950 bg-white px-3 py-2"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Short summary"
                />
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Message</span>
                <textarea
                    className="min-h-32 rounded border border-solid border-text-950 bg-white px-3 py-2"
                    name="body"
                    required
                    value={form.body}
                    onChange={handleChange}
                    placeholder="Describe the issue in detail..."
                />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="self-start rounded-md bg-primary-950 px-6 py-2 text-white disabled:opacity-60"
            >
                {submitting ? 'Sending...' : 'Submit ticket'}
            </button>
        </form>
    );
}
