import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import DesktopApp from './components/DesktopApp';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRedirect from './components/RoleRedirect';
import BookingModal from './modals/BookingModal';
import StaffModal from './modals/StaffModal';
import AdminModal from './modals/AdminModal';
import Toast from './components/Toast';
import { generateQRCells } from './data/mockData';
import * as authApi from './api/auth';
import { ROLE_MAP, ROLE_LABEL } from './api/auth';
import { useBadgeCounts } from './hooks/useBadgeCounts';
import { myNotifications } from './api/misc';
import { getToken } from './api/auth';
import { API_BASE_URL } from './api/client';

// Lazy-load all screens
import StudentDashboard from './screens/student/Dashboard';
import Catalogue from './screens/student/Catalogue';
import ResourceDetail from './screens/student/ResourceDetail';
import Rooms from './screens/student/Rooms';
import MyBookings from './screens/student/MyBookings';
import Waitlist from './screens/student/Waitlist';
import Recommendations from './screens/student/Recommendations';
import Points from './screens/student/Points';
import Profile from './screens/student/Profile';
import SelfCheckout from './screens/student/SelfCheckout';
import RoomCheckin from './screens/student/RoomCheckin';
import StaffDashboard from './screens/staff/Dashboard';
import Checkout from './screens/staff/Checkout';
import WaitlistReview from './screens/staff/WaitlistReview';
import Approvals from './screens/staff/Approvals';
import Overdue from './screens/staff/Overdue';
import ManageResources from './screens/staff/ManageResources';
import StaffRoomCheckin from './screens/staff/RoomCheckin';
import AdminDashboard from './screens/admin/Dashboard';
import Users from './screens/admin/Users';
import AuditLog from './screens/admin/AuditLog';
import Config from './screens/admin/Config';
import AdminResources from './screens/admin/Resources';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Default landing path per role.
const HOME_PATH = {
    admin: '/admin/dashboard',
    staff: '/staff/dashboard',
    lecturer: '/dashboard',
    student: '/dashboard',
};

// Build the `user` object the screens expect from a backend user record.
function toUiUser(u) {
    if (!u) return null;
    const roleKey = ROLE_MAP[u.role] ?? 'student';
    const initials = (u.name || '')
        .replace(/^(Dr|Prof)\.?\s*/i, '')
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
    const avatarBg = {
        admin: '#dc2626',
        staff: '#15803d',
        lecturer: '#0e7490',
        student: '#f59e0b',
    }[roleKey];
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: roleKey,
        rawRole: u.role,
        roleLabel: ROLE_LABEL[u.role] ?? u.role,
        initials,
        avatarBg,
        points: u.userPoints ?? 0,
        tier: u.tier ?? null,
        tierLabel: u.tier ? `Tier ${u.tier}` : '-',
        isActive: u.isActive,
    };
}

export default function App() {
    const [user, setUser] = useState(null); // backend user (adapted)
    const [authLoading, setAuthLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // UI / interaction state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const [bookingModal, setBookingModal] = useState({
        open: false,
        stage: 'booking',
        resource: null,
        bookDate: '2026-07-02',
        bookReturn: '2026-07-16',
        msg: '',
    });
    const [staffModal, setStaffModal] = useState({
        open: false,
        type: 'book',
        rf: {
            rtitle: '',
            rauthor: '',
            rcat: '',
            rcopies: 1,
            rtier: 1,
            rstatus: 'available',
        },
    });
    const [adminModal, setAdminModal] = useState({
        open: false,
        mode: 'addUser',
        uf: { uname: '', uemail: '', ubatch: '', uphone: '', urole: 'student' },
        editUser: null,
        copiesBook: null,
    });
    const [staffScan, setStaffScan] = useState({
        mode: 'checkout',
        stage: 'ready',
        walkinUser: 'Sahan Wickrama',
        walkinAssigned: false,
    });
    const [overdueNotified, setOverdueNotified] = useState({});
    const [userFilter, setUserFilter] = useState('All');
    const [tierFilter, setTierFilter] = useState('All');
    const [sortOpt, setSortOpt] = useState('Name');
    const [auditFilter, setAuditFilter] = useState('All');
    const [refreshKey, setRefreshKey] = useState(0);
    const [notifCount, setNotifCount] = useState(0);

    const currentRole = user?.role ?? 'student';

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Refresh-all trigger for screens after a mutation.
    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    // Live sidebar badge counts; refetches on refresh and polls every 60s.
    const badges = useBadgeCounts(user ? currentRole : null, refreshKey);

    // Notification unread count — refreshed by the panel after mark-all-read.
    const refreshNotifCount = useCallback(async () => {
        if (!user) return;
        try {
            const { items } = await myNotifications({ limit: 50 });
            setNotifCount((items || []).filter((n) => !n.read).length);
        } catch {
            /* keep last known count */
        }
    }, [user]);

    // SSE push — server emits an event each time a notification is created for
    // this user. No polling; reconnects automatically on connection drop.
    useEffect(() => {
        if (!user) {
            setNotifCount(0);
            return;
        }
        // Fetch the initial count once on login.
        refreshNotifCount();

        const token = getToken();
        if (!token) return;

        const sseUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(sseUrl);

        // Each SSE event means a new notification arrived for this user.
        es.onmessage = () => setNotifCount((c) => c + 1);

        // On auth error or permanent failure stop reconnecting.
        es.onerror = () => es.close();

        return () => es.close();
    }, [user, refreshNotifCount]);

    // --- Auth bootstrap: validate an existing token on load ---
    useEffect(() => {
        const token = authApi.getToken();
        if (!token) {
            setAuthLoading(false);
            return;
        }
        authApi
            .me()
            .then((u) => {
                const ui = toUiUser(u);
                setUser(ui);
            })
            .catch(() => localStorage.removeItem('accessToken'))
            .finally(() => setAuthLoading(false));
    }, []);

    // --- React to forced logout (401 with a Bearer token) ---
    useEffect(() => {
        const handler = () => {
            setUser(null);
            navigate('/login', { replace: true });
            showToast('Session expired — please sign in again');
        };
        window.addEventListener('auth:force-logout', handler);
        return () => window.removeEventListener('auth:force-logout', handler);
    }, [showToast, navigate]);

    async function signIn(email, password) {
        const u = await authApi.login(email, password);
        const ui = toUiUser(u);
        setUser(ui);
        // Navigate to the page the user was trying to access, or their home page
        const from = location.state?.from?.pathname;
        navigate(from || HOME_PATH[ui.role], { replace: true });
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
        navigate('/login', { replace: true });
    }

    function openBooking(resource) {
        // Default the pickers to today / today+14d (still editable in the modal) instead
        // of a hardcoded date, so startAt reflects when the booking is actually made.
        const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
        const bookDate = ymd(Date.now());
        const bookReturn = ymd(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const available = (resource.available ?? 0) > 0;
        if (!available) {
            setBookingModal({
                open: true,
                stage: 'waitlist',
                resource,
                bookDate,
                bookReturn,
                msg: '',
            });
        } else if (resource.type === 'device' && (resource.tier ?? 0) >= 4) {
            setBookingModal({
                open: true,
                stage: 'approval',
                resource,
                bookDate,
                bookReturn,
                msg: '',
            });
        } else {
            setBookingModal({
                open: true,
                stage: 'booking',
                resource,
                bookDate,
                bookReturn,
                msg: '',
            });
        }
    }

    const qrCells = generateQRCells();

    const ctx = {
        user,
        currentRole,
        signIn,
        logout,
        authLoading,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        toast,
        setToast,
        notifOpen,
        setNotifOpen,
        bookingModal,
        setBookingModal,
        staffModal,
        setStaffModal,
        adminModal,
        setAdminModal,
        staffScan,
        setStaffScan,
        overdueNotified,
        setOverdueNotified,
        userFilter,
        setUserFilter,
        tierFilter,
        setTierFilter,
        sortOpt,
        setSortOpt,
        auditFilter,
        setAuditFilter,
        refreshKey,
        refresh,
        showToast,
        openBooking,
        qrCells,
        badges,
        notifCount,
        refreshNotifCount,
    };

    if (authLoading) {
        return (
            <div
                style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Poppins', sans-serif",
                    color: '#16a34a',
                    fontWeight: 700,
                }}
            >
                Loading…
            </div>
        );
    }

    return (
        <AppContext.Provider value={ctx}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                <Routes>
                    {/* Public route */}
                    <Route
                        path="/login"
                        element={
                            !user ? <Login /> : <Navigate to={HOME_PATH[currentRole]} replace />
                        }
                    />

                    {/* Authenticated layout */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <DesktopApp />
                            </ProtectedRoute>
                        }
                    >
                        {/* Root redirect */}
                        <Route index element={<RoleRedirect />} />

                        {/* Student & Lecturer routes */}
                        <Route
                            path="dashboard"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <StudentDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="catalogue"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <Catalogue />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="catalogue/:resourceId"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <ResourceDetail />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="my-bookings"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <MyBookings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="waitlist"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <Waitlist />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="recommendations"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <Recommendations />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="points"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <Points />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="rooms"
                            element={
                                <ProtectedRoute roles={['student']}>
                                    <Rooms />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="profile" element={<Profile />} />
                        <Route
                            path="self-checkout"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <SelfCheckout />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="room-checkin"
                            element={
                                <ProtectedRoute roles={['student', 'lecturer']}>
                                    <RoomCheckin />
                                </ProtectedRoute>
                            }
                        />

                        {/* Staff routes */}
                        <Route
                            path="staff/dashboard"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <StaffDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/checkout"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <Checkout />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/waitlist-review"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <WaitlistReview />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/approvals"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <Approvals />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/overdue"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <Overdue />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/manage"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <ManageResources />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="staff/room-checkin"
                            element={
                                <ProtectedRoute roles={['staff']}>
                                    <StaffRoomCheckin />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin routes */}
                        <Route
                            path="admin/dashboard"
                            element={
                                <ProtectedRoute roles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="admin/users"
                            element={
                                <ProtectedRoute roles={['admin']}>
                                    <Users />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="admin/audit"
                            element={
                                <ProtectedRoute roles={['admin']}>
                                    <AuditLog />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="admin/config"
                            element={
                                <ProtectedRoute roles={['admin']}>
                                    <Config />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="admin/resources"
                            element={
                                <ProtectedRoute roles={['admin']}>
                                    <AdminResources />
                                </ProtectedRoute>
                            }
                        />

                        {/* Catch-all */}
                        <Route path="*" element={<RoleRedirect />} />
                    </Route>
                </Routes>

                {bookingModal.open && <BookingModal />}
                {staffModal.open && <StaffModal />}
                {adminModal.open && <AdminModal />}
                {toast && <Toast msg={toast} />}
            </div>
        </AppContext.Provider>
    );
}
