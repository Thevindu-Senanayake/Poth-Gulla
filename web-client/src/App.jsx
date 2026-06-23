import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Login from './components/Login';
import DesktopApp from './components/DesktopApp';
import BookingModal from './modals/BookingModal';
import StaffModal from './modals/StaffModal';
import AdminModal from './modals/AdminModal';
import Toast from './components/Toast';
import { generateQRCells } from './data/mockData';
import * as authApi from './api/auth';
import { ROLE_MAP, ROLE_LABEL } from './api/auth';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Default landing page per role.
const HOME_PAGE = { admin: 'adminDash', staff: 'staffDash', lecturer: 'dashboard', student: 'dashboard' };

// Build the `user` object the screens expect from a backend user record.
function toUiUser(u) {
  if (!u) return null;
  const roleKey = ROLE_MAP[u.role] ?? 'student';
  const initials = (u.name || '')
    .replace(/^(Dr|Prof)\.?\s*/i, '')
    .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const avatarBg = { admin: '#dc2626', staff: '#15803d', lecturer: '#0e7490', student: '#f59e0b' }[roleKey];
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
    tierLabel: u.tier ? `Tier ${u.tier}` : '—',
    isActive: u.isActive,
  };
}

export default function App() {
  const [user, setUser] = useState(null);          // backend user (adapted)
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState('dashboard');

  // UI / interaction state
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bookingModal, setBookingModal] = useState({ open: false, stage: 'booking', resource: null, bookDate: '2026-07-02', bookReturn: '2026-07-16', msg: '' });
  const [staffModal, setStaffModal] = useState({ open: false, type: 'book', rf: { rtitle: '', rauthor: '', rcat: '', rcopies: 1, rtier: 1, rstatus: 'available' } });
  const [adminModal, setAdminModal] = useState({ open: false, mode: 'addUser', uf: { uname: '', uemail: '', ubatch: '', uphone: '', urole: 'student' }, editUser: null, copiesBook: null });
  const [staffScan, setStaffScan] = useState({ mode: 'checkout', stage: 'ready', walkinUser: 'Sahan Wickrama', walkinAssigned: false });
  const [overdueNotified, setOverdueNotified] = useState({});
  const [userFilter, setUserFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [sortOpt, setSortOpt] = useState('Name');
  const [auditFilter, setAuditFilter] = useState('All');
  const [refreshKey, setRefreshKey] = useState(0);

  const currentRole = user?.role ?? 'student';

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Refresh-all trigger for screens after a mutation.
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // --- Auth bootstrap: validate an existing token on load ---
  useEffect(() => {
    const token = authApi.getToken();
    if (!token) { setAuthLoading(false); return; }
    authApi.me()
      .then((u) => { const ui = toUiUser(u); setUser(ui); setPage(HOME_PAGE[ui.role]); })
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => setAuthLoading(false));
  }, []);

  // --- React to forced logout (401 with a Bearer token) ---
  useEffect(() => {
    const handler = () => { setUser(null); showToast('Session expired — please sign in again'); };
    window.addEventListener('auth:force-logout', handler);
    return () => window.removeEventListener('auth:force-logout', handler);
  }, [showToast]);

  async function signIn(email, password) {
    const u = await authApi.login(email, password);
    const ui = toUiUser(u);
    setUser(ui);
    setPage(HOME_PAGE[ui.role]);
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
    setPage('dashboard');
  }

  function openBooking(resource) {
    const available = (resource.available ?? 0) > 0;
    if (!available) {
      setBookingModal({ open: true, stage: 'waitlist', resource, bookDate: '2026-07-02', bookReturn: '2026-07-16', msg: '' });
    } else if (resource.type === 'device' && (resource.tier ?? 0) >= 4) {
      setBookingModal({ open: true, stage: 'approval', resource, bookDate: '2026-07-02', bookReturn: '2026-07-16', msg: '' });
    } else {
      setBookingModal({ open: true, stage: 'booking', resource, bookDate: '2026-07-02', bookReturn: '2026-07-16', msg: '' });
    }
  }

  const qrCells = generateQRCells();

  const ctx = {
    user, currentRole, signIn, logout, authLoading,
    page, setPage,
    selectedResource, setSelectedResource, searchQuery, setSearchQuery,
    typeFilter, setTypeFilter, toast, setToast, notifOpen, setNotifOpen,
    bookingModal, setBookingModal, staffModal, setStaffModal, adminModal, setAdminModal,
    staffScan, setStaffScan, overdueNotified, setOverdueNotified,
    userFilter, setUserFilter, tierFilter, setTierFilter, sortOpt, setSortOpt,
    auditFilter, setAuditFilter,
    refreshKey, refresh, showToast, openBooking, qrCells,
  };

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Public Sans', sans-serif", color: '#16a34a', fontWeight: 700 }}>
        Loading…
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {!user && <Login />}
        {user && <DesktopApp />}
        {bookingModal.open && <BookingModal />}
        {staffModal.open && <StaffModal />}
        {adminModal.open && <AdminModal />}
        {toast && <Toast msg={toast} />}
      </div>
    </AppContext.Provider>
  );
}
