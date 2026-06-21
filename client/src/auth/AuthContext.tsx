import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

type User = {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'LIBRARY_STAFF' | 'LECTURER' | 'STUDENT';
    userPoints: number;
    tier: number | null;
};

type AuthContextValue = {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
const MOBILE_ROLES = ['STUDENT', 'LECTURER'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const token = await SecureStore.getItemAsync('accessToken');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data);
                } catch {
                    await SecureStore.deleteItemAsync('accessToken');
                }
            }
            setIsLoading(false);
        })();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (!MOBILE_ROLES.includes(data.user.role)) {
            throw new Error('This app is for students and lecturers. Staff use the admin dashboard.');
        }
        await SecureStore.setItemAsync('accessToken', data.accessToken);
        setUser(data.user);
    };

    const signOut = async () => {
        await SecureStore.deleteItemAsync('accessToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
