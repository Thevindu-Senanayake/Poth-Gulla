import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';

type User = {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'LIBRARY_STAFF' | 'LECTURER' | 'STUDENT';
};

type AuthContextValue = {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
const STAFF_ROLES = ['ADMIN', 'LIBRARY_STAFF'];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setIsLoading(false);
            return;
        }
        api
            .get('/auth/me')
            .then((res) => setUser(res.data))
            .catch(() => localStorage.removeItem('accessToken'))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        const handler = () => setUser(null);
        window.addEventListener('auth:force-logout', handler);
        return () => window.removeEventListener('auth:force-logout', handler);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (!STAFF_ROLES.includes(data.user.role)) {
            throw new Error('The admin dashboard is for staff and admins only.');
        }
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
