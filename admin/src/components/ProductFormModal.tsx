import { FormEvent, useState } from 'react';
import { CATEGORIES } from '@/types/entities.types';
import type { Category, Product, ProductInput } from '@/types/entities.types';

type ProductFormModalProps = {
    product: Product | null;
    onClose: () => void;
    onSubmit: (product: ProductInput) => Promise<void>;
};

const emptyForm = {
    title: '',
    description: '',
    category: CATEGORIES[0] as Category,
    price: 0,
    rating: 0,
    stock: 0,
    brand: '',
    thumbnail: '',
};

export const ProductFormModal = ({ product, onClose, onSubmit }: ProductFormModalProps) => {
    const [form, setForm] = useState(
        product
            ? {
                  title: product.title,
                  description: product.description ?? '',
                  category: product.category,
                  price: product.price,
                  rating: product.rating,
                  stock: product.stock,
                  brand: product.brand ?? '',
                  thumbnail: product.thumbnail ?? '',
              }
            : emptyForm
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await onSubmit({
                title: form.title,
                description: form.description || null,
                category: form.category,
                price: Number(form.price),
                rating: Number(form.rating),
                stock: Number(form.stock),
                brand: form.brand || null,
                thumbnail: form.thumbnail || null,
                images: product?.images ?? null,
                return_policy: product?.return_policy ?? null,
                shipping_info: product?.shipping_info ?? null,
                warranty_info: product?.warranty_info ?? null,
                dimension: product?.dimension ?? null,
            });
        } catch {
            setError('Could not save product. Check the values and try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
            <form
                onSubmit={handleSubmit}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            >
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    {product ? 'Edit product' : 'New product'}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <label className="col-span-2 text-sm font-medium text-slate-700">
                        Title
                        <input
                            required
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>

                    <label className="col-span-2 text-sm font-medium text-slate-700">
                        Description
                        <textarea
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Category
                        <select
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                        >
                            {CATEGORIES.map((category) => (
                                <option
                                    key={category}
                                    value={category}
                                >
                                    {category}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Brand
                        <input
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.brand}
                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Price ($)
                        <input
                            required
                            type="number"
                            min={0}
                            step="0.01"
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Stock
                        <input
                            required
                            type="number"
                            min={0}
                            step="1"
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.stock}
                            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                        />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Rating (0-5)
                        <input
                            required
                            type="number"
                            min={0}
                            max={5}
                            step="0.1"
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.rating}
                            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                        />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                        Thumbnail URL
                        <input
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                            value={form.thumbnail}
                            onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                        />
                    </label>
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {submitting ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    );
};
