import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { auth, initializing } = useAuth();
    const location = useLocation();

    if (initializing) {
        return (
            <div className="flex min-h-screen items-center justify-center text-slate-500">
                Loading…
            </div>
        );
    }

    if (!auth) {
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname }}
                replace
            />
        );
    }

    return <>{children}</>;
};
