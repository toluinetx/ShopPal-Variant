import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Login = () => {
    const { auth, loginByUsername } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (auth) {
        const redirectTo = (location.state as { from?: string } | null)?.from ?? '/products';
        return (
            <Navigate
                to={redirectTo}
                replace
            />
        );
    }

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await loginByUsername(username, password);
            navigate('/products', { replace: true });
        } catch {
            setError('Invalid username or password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
            >
                <h1 className="mb-1 text-2xl font-semibold text-slate-900">ShopPal Admin</h1>
                <p className="mb-6 text-sm text-slate-500">Sign in to manage the store.</p>

                <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                <input
                    className="mb-4 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                />

                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                    type="password"
                    className="mb-6 w-full rounded border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />

                {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    {submitting ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    );
};
