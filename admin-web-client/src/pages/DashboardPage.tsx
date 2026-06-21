import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
    const { user, logout } = useAuth();
    return (
        <div className="p-8">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Poth Gulla — Admin</h1>
                <button className="rounded bg-slate-200 px-3 py-1" onClick={logout}>
                    Sign out
                </button>
            </div>
            <p className="text-slate-600">
                Signed in as {user?.name} ({user?.role})
            </p>
            {/* Build the waitlist queue, audit log, and approval views here */}
        </div>
    );
}
