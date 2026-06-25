import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import NotificationPanel from './NotificationPanel';

const BOOK_SVG = 'M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z';

const NAV_STUDENT = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
    {
        path: '/catalogue',
        label: 'Catalogue',
        d: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
    },
    {
        path: '/my-bookings',
        label: 'My Bookings',
        d: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4',
    },
    {
        path: '/waitlist',
        label: 'Waitlist',
        d: 'M4 7h16M4 12h16M4 17h10',
    },
    {
        path: '/recommendations',
        label: 'Recommendations',
        d: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z',
    },
    {
        path: '/points',
        label: 'Points & Tier',
        d: 'M12 17.5l-5 3 1.5-5.5-4.5-3.5 5.5-.5L12 6l2 5.5 5.5.5-4.5 3.5 1.5 5.5z',
    },
    { path: '/rooms', label: 'Study Rooms', d: 'M3 3h18v18H3zM9 3v18' },
    {
        path: '/self-checkout',
        label: 'Self Checkout',
        d: 'M3 7h18M3 7l2-3h14l2 3M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7M9 11l2 2 4-4',
    },
    {
        path: '/room-checkin',
        label: 'Room Check-in',
        d: 'M3 3h18v18H3zM9 3v18M3 11h6M14 7h4M14 11h4M14 15h4',
    },
    {
        path: '/profile',
        label: 'Profile',
        d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
];

const NAV_LECTURER = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
    {
        path: '/catalogue',
        label: 'Catalogue',
        d: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
    },
    {
        path: '/my-bookings',
        label: 'My Bookings',
        d: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4',
    },
    {
        path: '/waitlist',
        label: 'Waitlist',
        d: 'M4 7h16M4 12h16M4 17h10',
    },
    {
        path: '/recommendations',
        label: 'Recommendations',
        d: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z',
    },
    {
        path: '/points',
        label: 'Points & Tier',
        d: 'M12 17.5l-5 3 1.5-5.5-4.5-3.5 5.5-.5L12 6l2 5.5 5.5.5-4.5 3.5 1.5 5.5z',
    },
    {
        path: '/self-checkout',
        label: 'Self Checkout',
        d: 'M3 7h18M3 7l2-3h14l2 3M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7M9 11l2 2 4-4',
    },
    {
        path: '/profile',
        label: 'Profile',
        d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
];

const NAV_STAFF = [
    {
        path: '/staff/dashboard',
        label: 'Dashboard',
        d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
    {
        path: '/staff/checkout',
        label: 'Checkout / Return',
        d: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6',
    },
    {
        path: '/staff/waitlist-review',
        label: 'Waitlist Review',
        d: 'M4 5h16v11H7l-3 3z',
    },
    {
        path: '/staff/approvals',
        label: 'Device Approvals',
        d: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
    },
    {
        path: '/staff/overdue',
        label: 'Overdue',
        d: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
    },
    {
        path: '/staff/manage',
        label: 'Manage Resources',
        d: 'M4 7h16M4 12h16M4 17h10',
    },
    {
        path: '/profile',
        label: 'Profile',
        d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
];

const NAV_ADMIN = [
    {
        path: '/admin/dashboard',
        label: 'Overview',
        d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
    {
        path: '/admin/users',
        label: 'Users',
        d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
    },
    {
        path: '/admin/audit',
        label: 'Audit Log',
        d: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    },
    {
        path: '/admin/config',
        label: 'Config',
        d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    },
    {
        path: '/admin/resources',
        label: 'Resources',
        d: 'M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z',
    },
    {
        path: '/profile',
        label: 'Profile',
        d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
];

const ROLE_LABEL_MAP = {
    student: 'Student',
    lecturer: 'Lecturer',
    staff: 'Library Staff',
    admin: 'Administrator',
};

function NavItem({ item, active, onClick, badge }) {
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
            }}
        >
            <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}
            >
                {item.d
                    .split('M')
                    .filter(Boolean)
                    .map((seg, i) => (
                        <path key={i} d={'M' + seg} />
                    ))}
            </svg>
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
    const {
        currentRole,
        user,
        logout,
        badges,
        notifOpen,
        setNotifOpen,
        notifCount,
        refreshNotifCount,
    } = useApp();
    const navigate = useNavigate();
    const location = useLocation();

    const navMap = {
        student: NAV_STUDENT,
        lecturer: NAV_LECTURER,
        staff: NAV_STAFF,
        admin: NAV_ADMIN,
    };
    const navItems = navMap[currentRole] || NAV_STUDENT;

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
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d={BOOK_SVG} />
                        <path d="M5 19a1 1 0 0 1 1-1h13" />
                    </svg>
                </div>
                <div>
                    <div
                        className="pg-brand"
                        style={{
                            fontSize: 17,
                            color: '#16231b',
                        }}
                    >
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
                {/* Notification bell */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={() => setNotifOpen((o) => !o)}
                        title="Notifications"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            background: notifOpen ? '#e8f5e9' : '#f4f4f8',
                            color: notifOpen ? '#16a34a' : '#7c7e93',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {notifCount > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: -3,
                                    right: -3,
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: '1px 4px',
                                    borderRadius: 20,
                                    minWidth: 15,
                                    textAlign: 'center',
                                    lineHeight: '14px',
                                }}
                            >
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Logout */}
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
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>

            {notifOpen && (
                <NotificationPanel onClose={() => setNotifOpen(false)} onRead={refreshNotifCount} />
            )}
        </div>
    );
}
