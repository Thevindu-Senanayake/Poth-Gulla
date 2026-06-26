import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import NotificationPanel from './NotificationPanel';
import {
    LayoutDashboard,
    Search,
    CalendarDays,
    ListCollapse,
    Sparkles,
    Award,
    DoorOpen,
    QrCode,
    User,
    CheckSquare,
    ClipboardList,
    ShieldAlert,
    Clock,
    FolderCog,
    Users,
    History,
    Settings,
    BookOpen,
    LogOut,
} from 'lucide-react';

// Maps your internal role values to clean, user-facing titles
const ROLE_LABEL_MAP = {
    student: 'Student',
    lecturer: 'Lecturer',
    staff: 'Library Staff',
    admin: 'Administrator',
};

// Lightweight navigation map containing only paths, labels, and the component references
const NAV_CONFIG = {
    student: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/catalogue', label: 'Catalogue', icon: Search },
        { path: '/my-bookings', label: 'My Bookings', icon: CalendarDays },
        { path: '/waitlist', label: 'Waitlist', icon: ListCollapse },
        { path: '/recommendations', label: 'Recommendations', icon: Sparkles },
        { path: '/points', label: 'Points & Tier', icon: Award },
        { path: '/rooms', label: 'Study Rooms', icon: DoorOpen },
        { path: '/self-checkout', label: 'Self Checkout', icon: QrCode },
        { path: '/room-checkin', label: 'Room Check-in', icon: DoorOpen },
        { path: '/profile', label: 'Profile', icon: User },
    ],
    lecturer: [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/catalogue', label: 'Catalogue', icon: Search },
        { path: '/my-bookings', label: 'My Bookings', icon: CalendarDays },
        { path: '/waitlist', label: 'Waitlist', icon: ListCollapse },
        { path: '/recommendations', label: 'Recommendations', icon: Sparkles },
        { path: '/points', label: 'Points & Tier', icon: Award },
        { path: '/self-checkout', label: 'Self Checkout', icon: QrCode },
        { path: '/profile', label: 'Profile', icon: User },
    ],
    staff: [
        { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/staff/checkout', label: 'Checkout / Return', icon: CheckSquare },
        { path: '/staff/room-checkin', label: 'Room Check-in', icon: DoorOpen },
        { path: '/staff/waitlist-review', label: 'Waitlist Review', icon: ClipboardList },
        { path: '/staff/approvals', label: 'Device Approvals', icon: ShieldAlert },
        { path: '/staff/overdue', label: 'Overdue', icon: Clock },
        { path: '/staff/manage', label: 'Manage Resources', icon: FolderCog },
        { path: '/profile', label: 'Profile', icon: User },
    ],
    admin: [
        { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/audit', label: 'Audit Log', icon: History },
        { path: '/admin/config', label: 'Config', icon: Settings },
        { path: '/admin/resources', label: 'Resources', icon: BookOpen },
        { path: '/profile', label: 'Profile', icon: User },
    ],
};

function NavItem({ item, active, onClick, badge }) {
    // Dynamic component rendering capitalization requirement
    const IconComponent = item.icon;

    return (
        <button
            onClick={() => onClick(item.path)}
            className={`pg-nav-item${active ? ' is-active' : ''}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: active
                    ? 'linear-gradient(135deg,#16a34a,#22c55e 55%,#4ade80)'
                    : 'transparent',
                color: active ? '#fff' : '#5c5e72',
                fontWeight: active ? 600 : 500,
                fontSize: 13.5,
                textAlign: 'left',
                boxShadow: active ? '0 4px 14px rgba(22,163,74,.28)' : 'none',
                position: 'relative',
                transition: 'all 0.2s ease',
            }}
        >
            {IconComponent && (
                <IconComponent size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {badge > 0 && (
                <span
                    style={{
                        background: active ? 'rgba(255,255,255,.28)' : '#ef4444',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 20,
                        minWidth: 18,
                        textAlign: 'center',
                    }}
                >
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );
}

export default function Sidebar() {
    const { currentRole, user, logout, badges } = useApp();
    const navigate = useNavigate();
    const location = useLocation();

    // Fallbacks cleanly to student nav if a broken role string slips through
    const navItems = NAV_CONFIG[currentRole] || NAV_CONFIG.student;

    const initials = user?.initials || '??';
    const avatarBg = user?.avatarBg || '#7c7e93';
    const userName = user?.name || 'User';
    const roleLabel = ROLE_LABEL_MAP[currentRole] || 'User';

    function isActive(itemPath) {
        const current = location.pathname;
        if (current === itemPath) return true;
        if (itemPath === '/catalogue' && current.startsWith('/catalogue/')) return true;
        return false;
    }

    return (
        <div
            style={{
                width: 248,
                background: '#fff',
                borderRight: '1px solid #e7e7ef',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0,
            }}
        >
            {/* Header Brand */}
            <div
                style={{
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid #f0f0f8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 10px rgba(22,163,74,.25)',
                    }}
                >
                    <BookOpen size={20} color="#fff" />
                </div>
                <div>
                    <div className="pg-brand" style={{ fontSize: 17, color: '#16231b' }}>
                        Poth Gulla
                    </div>
                    <div
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9.5,
                            color: '#9b9db2',
                            marginTop: 1,
                        }}
                    >
                        Library System
                    </div>
                </div>
            </div>

            {/* Navigation Body */}
            <div
                style={{
                    flex: 1,
                    padding: '12px 12px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                {navItems.map((item) => (
                    <NavItem
                        key={item.path}
                        item={item}
                        active={isActive(item.path)}
                        badge={badges?.[item.path] ?? 0}
                        onClick={(path) => navigate(path)}
                    />
                ))}
            </div>

            {/* Footer Profile & Utility Panel */}
            <div
                style={{
                    borderTop: '1px solid #f0f0f8',
                    padding: '14px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: avatarBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                    }}
                >
                    {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#16231b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {userName}
                    </div>
                    <div style={{ fontSize: 11, color: '#9b9db2', marginTop: 1 }}>{roleLabel}</div>
                </div>

                {/* Logout Action */}
                <button
                    onClick={logout}
                    title="Sign out"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: '#f4f4f8',
                        color: '#7c7e93',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
    );
}
