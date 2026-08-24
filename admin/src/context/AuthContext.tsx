import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setAccessToken, setUnauthorizedHandler } from '@/api/client';
import * as AdminApi from '@/api/admin.service';
import type { Admin } from '@/types/entities.types';

type AuthState = {
    admin: Admin;
    accessToken: string;
};

type AuthContextValue = {
    auth: AuthState | null;
    initializing: boolean;
    loginByUsername: (username: string, password: string) => Promise<void>;
    loginByEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [auth, setAuth] = useState<AuthState | null>(null);
    const [initializing, setInitializing] = useState(true);

    const applySession = useCallback((accessToken: string, admin: Admin) => {
        setAccessToken(accessToken);
        setAuth({ accessToken, admin });
    }, []);

    const clearSession = useCallback(() => {
        setAccessToken(null);
        setAuth(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(() => clearSession());

        AdminApi.refreshSession()
            .then(({ accessToken, admin }) => applySession(accessToken, admin))
            .catch(() => clearSession())
            .finally(() => setInitializing(false));

        return () => setUnauthorizedHandler(null);
    }, [applySession, clearSession]);

    const loginByUsername = useCallback(
        async (username: string, password: string) => {
            const { accessToken, admin } = await AdminApi.loginByUsername(username, password);
            applySession(accessToken, admin);
        },
        [applySession]
    );

    const loginByEmail = useCallback(
        async (email: string, password: string) => {
            const { accessToken, admin } = await AdminApi.loginByEmail(email, password);
            applySession(accessToken, admin);
        },
        [applySession]
    );

    const logout = useCallback(async () => {
        try {
            await AdminApi.logout();
        } finally {
            clearSession();
        }
    }, [clearSession]);

    const value = useMemo(
        () => ({ auth, initializing, loginByUsername, loginByEmail, logout }),
        [auth, initializing, loginByUsername, loginByEmail, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};
