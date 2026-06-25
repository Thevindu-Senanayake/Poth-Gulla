import { useEffect, useRef } from 'react';
import { myNotifications, markAllNotificationsRead, markNotificationRead } from '../api/misc';
import { useFetch } from '../hooks/useFetch';

function timeAgo(d) {
    try {
        const diffMs = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    } catch {
        return '';
    }
}

const TYPE_ICON = {
    BOOKING_APPROVED: { icon: '✓', col: '#16a34a', bg: '#d7f8e9' },
    BOOKING_REJECTED: { icon: '✕', col: '#ef4444', bg: '#fee2e2' },
    BOOKING_CANCELLED: { icon: '✕', col: '#ef4444', bg: '#fee2e2' },
    BOOKING_PENDING: { icon: '…', col: '#d97706', bg: '#fef3c7' },
    BOOKING_WAITLISTED: { icon: '⏳', col: '#6366f1', bg: '#ede9fe' },
    WAITLIST_PROMOTED: { icon: '↑', col: '#16a34a', bg: '#d7f8e9' },
    WAITLIST_DISMISSED: { icon: '✕', col: '#7c7e93', bg: '#f4f4f8' },
};

export default function NotificationPanel({ onClose, onRead }) {
    const panelRef = useRef(null);
    const { data, loading, reload } = useFetch(() => myNotifications({ limit: 30 }), []);
    const notifications = data?.items || [];
    const hasUnread = notifications.some((n) => !n.read);

    // Close on outside click
    useEffect(() => {
        function handler(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    async function handleMarkAll() {
        await markAllNotificationsRead();
        reload();
        onRead();
    }

    async function handleMarkOne(id) {
        await markNotificationRead(id);
        reload();
        onRead();
    }

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                bottom: 64,
                left: 14,
                width: 320,
                background: '#fff',
                border: '1px solid #e7e7ef',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 1000,
                overflow: 'hidden',
                fontFamily: "'Public Sans', sans-serif",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px 10px',
                    borderBottom: '1px solid #f0f0f8',
                }}
            >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16231b' }}>
                    Notifications
                </span>
                {hasUnread && (
                    <button
                        onClick={handleMarkAll}
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#16a34a',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Body */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {loading && (
                    <div
                        style={{
                            padding: '30px 16px',
                            textAlign: 'center',
                            color: '#9b9db2',
                            fontSize: 12,
                        }}
                    >
                        Loading…
                    </div>
                )}
                {!loading && notifications.length === 0 && (
                    <div
                        style={{
                            padding: '30px 16px',
                            textAlign: 'center',
                            color: '#9b9db2',
                            fontSize: 13,
                        }}
                    >
                        No notifications yet
                    </div>
                )}
                {notifications.map((n) => {
                    const meta = TYPE_ICON[n.type] || { icon: '•', col: '#7c7e93', bg: '#f4f4f8' };
                    return (
                        <div
                            key={n.id}
                            onClick={() => !n.read && handleMarkOne(n.id)}
                            style={{
                                display: 'flex',
                                gap: 12,
                                padding: '12px 16px',
                                borderBottom: '1px solid #f0f0f8',
                                background: n.read ? '#fff' : '#f8fff8',
                                cursor: n.read ? 'default' : 'pointer',
                                alignItems: 'flex-start',
                            }}
                        >
                            <div
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 8,
                                    background: meta.bg,
                                    color: meta.col,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                }}
                            >
                                {meta.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: '#16231b',
                                        lineHeight: 1.4,
                                        marginBottom: 3,
                                        fontWeight: n.read ? 400 : 600,
                                    }}
                                >
                                    {n.message}
                                </div>
                                <div style={{ fontSize: 11, color: '#9b9db2' }}>
                                    {timeAgo(n.createdAt)}
                                </div>
                            </div>
                            {!n.read && (
                                <div
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#16a34a',
                                        flexShrink: 0,
                                        marginTop: 4,
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
