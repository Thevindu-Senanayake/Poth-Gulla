import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            await login(email.trim(), password);
            navigate('/');
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e.message ?? 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
                <h1 className="mb-6 text-xl font-semibold">Poth Gulla — Staff Login</h1>
                <input
                    className="mb-3 w-full rounded border px-3 py-2"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                />
                <input
                    className="mb-3 w-full rounded border px-3 py-2"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                />
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <button
                    className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
                    onClick={onSubmit}
                    disabled={loading}
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </div>
        </div>
    );
}
