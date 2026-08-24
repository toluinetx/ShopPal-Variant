import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Layout = ({ children }: { children: ReactNode }) => {
    const { auth, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
                <span className="text-lg font-semibold text-slate-900">ShopPal Admin</span>
                <div className="flex items-center gap-4">
                    {auth && <span className="text-sm text-slate-500">{auth.admin.username}</span>}
                    <button
                        onClick={handleLogout}
                        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Log out
                    </button>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
    );
};
