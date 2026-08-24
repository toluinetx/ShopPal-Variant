import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProductFormModal } from '@/components/ProductFormModal';
import * as ProductApi from '@/api/product.service';
import type { Product, ProductInput } from '@/types/entities.types';

const PAGE_SIZE = 20;

export const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [creating, setCreating] = useState(false);

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const results = await ProductApi.getProducts({
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                title: search || undefined,
                sortBy: 'title',
                order: 'asc',
            });
            setProducts(results);
        } catch {
            setError('Could not load products.');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleCreate = async (product: ProductInput) => {
        await ProductApi.createProduct(product);
        setCreating(false);
        await loadProducts();
    };

    const handleUpdate = async (product: ProductInput) => {
        if (!editingProduct) return;
        await ProductApi.updateProduct(editingProduct.product_id, product);
        setEditingProduct(null);
        await loadProducts();
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
        await ProductApi.deleteProduct(product.product_id);
        await loadProducts();
    };

    return (
        <Layout>
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-xl font-semibold text-slate-900">Products</h1>
                <div className="flex items-center gap-3">
                    <input
                        placeholder="Search by title…"
                        value={search}
                        onChange={(e) => {
                            setPage(0);
                            setSearch(e.target.value);
                        }}
                        className="w-64 rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                        onClick={() => setCreating(true)}
                        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        + New product
                    </button>
                </div>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Price</th>
                            <th className="px-4 py-3 font-medium">Stock</th>
                            <th className="px-4 py-3 font-medium">Rating</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-6 text-center text-slate-400"
                                >
                                    Loading…
                                </td>
                            </tr>
                        )}
                        {!loading && products.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-6 text-center text-slate-400"
                                >
                                    No products found.
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            products.map((product) => (
                                <tr key={product.product_id}>
                                    <td className="px-4 py-3 font-medium text-slate-900">{product.title}</td>
                                    <td className="px-4 py-3 text-slate-500">{product.category}</td>
                                    <td className="px-4 py-3 text-slate-900">${product.price.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-slate-500">{product.stock}</td>
                                    <td className="px-4 py-3 text-slate-500">{product.rating.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setEditingProduct(product)}
                                            className="mr-3 text-indigo-600 hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
                >
                    Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                    onClick={() => setPage((p) => (products.length < PAGE_SIZE ? p : p + 1))}
                    disabled={products.length < PAGE_SIZE}
                    className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
                >
                    Next
                </button>
            </div>

            {creating && (
                <ProductFormModal
                    product={null}
                    onClose={() => setCreating(false)}
                    onSubmit={handleCreate}
                />
            )}
            {editingProduct && (
                <ProductFormModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSubmit={handleUpdate}
                />
            )}
        </Layout>
    );
};
