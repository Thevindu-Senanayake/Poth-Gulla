import { useState } from 'react';
import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { allBookings, approveBooking, rejectBooking } from '../../api/bookings';
import { loadLookups } from '../../api/lookups';
import { Loading, ErrorState, Empty } from '../../components/States';

function SvgIcon({ path, color, size = 16 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {path
                .split('M')
                .filter(Boolean)
                .map((d, i) => (
                    <path key={i} d={'M' + d} />
                ))}
        </svg>
    );
}

/* ── Confirmation dialog ── */
function ConfirmDialog({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(6,24,15,0.48)',
                backdropFilter: 'blur(4px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pg-pop .15s ease both',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '28px 28px 22px',
                    width: 400,
                    maxWidth: '92vw',
                    boxShadow: '0 20px 50px rgba(6,24,15,0.22)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${confirmColor}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <SvgIcon
                            path="M12 9v4M12 17h.01M12 3l9.5 16.5H2.5z"
                            color={confirmColor}
                            size={18}
                        />
                    </div>
                    <h3
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#1a1b2e',
                            margin: 0,
                        }}
                    >
                        {title}
                    </h3>
                </div>
                <p
                    style={{
                        fontSize: 13,
                        color: '#5a5c74',
                        lineHeight: 1.65,
                        margin: '0 0 20px',
                        paddingLeft: 46,
                    }}
                >
                    {message}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '9px 20px',
                            borderRadius: 9,
                            border: '1.5px solid #e7e7ef',
                            background: '#fff',
                            color: '#3a3b4e',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '9px 20px',
                            borderRadius: 9,
                            border: 'none',
                            background: confirmColor,
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: `0 2px 10px ${confirmColor}40`,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function initialsOf(name = '') {
    return (
        name
            .split(/\s+/)
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'
    );
}
function fmt(d) {
    try {
        return new Date(d).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return d;
    }
}

export default function Approvals() {
    const { showToast, refresh } = useApp();
    const { data, loading, error, reload } = useFetch(
        () =>
            Promise.all([
                allBookings({ status: 'PENDING', resourceType: 'DEVICE' }),
                loadLookups(),
            ]).then(([b, lk]) => ({ items: b.items, lk })),
        []
    );

    // Confirmation dialog state
    const [confirm, setConfirm] = useState({
        open: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        confirmColor: '#16a34a',
        onConfirm: () => {},
    });

    function askConfirm({ title, message, confirmLabel, confirmColor, onConfirm }) {
        setConfirm({
            open: true,
            title,
            message,
            confirmLabel: confirmLabel || 'Confirm',
            confirmColor: confirmColor || '#16a34a',
            onConfirm: () => {
                setConfirm((c) => ({ ...c, open: false }));
                onConfirm();
            },
        });
    }
    function closeConfirm() {
        setConfirm((c) => ({ ...c, open: false }));
    }

    if (loading) return <Loading label="Loading approvals…" />;
    if (error) return <ErrorState error={error} onRetry={reload} />;
    const lk = data?.lk;
    const list = (data?.items || []).map((b) => ({
        ...b,
        userName: lk ? lk.userName(b.userId) : b.userName || 'Member',
        title: lk ? lk.resourceName(b) : b.title,
    }));

    async function approve(id) {
        try {
            await approveBooking(id);
            showToast('Pickup approved');
            refresh();
        } catch (e) {
            showToast(e?.response?.data?.message ?? 'Could not approve');
        }
    }
    async function reject(id) {
        try {
            await rejectBooking(id);
            showToast('Request rejected');
            refresh();
        } catch (e) {
            showToast(e?.response?.data?.message ?? 'Could not reject');
        }
    }

    return (
        <div
            style={{
                padding: '30px 30px 40px',
                fontFamily: "'Public Sans', sans-serif",
                minHeight: '100%',
            }}
        >
            {/* Confirmation modal */}
            <ConfirmDialog
                open={confirm.open}
                title={confirm.title}
                message={confirm.message}
                confirmLabel={confirm.confirmLabel}
                confirmColor={confirm.confirmColor}
                onConfirm={confirm.onConfirm}
                onCancel={closeConfirm}
            />

            <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 3px' }}>Staff · Devices</p>
                <h1
                    style={{
                        fontFamily: "'Spectral', serif",
                        fontSize: 26,
                        fontWeight: 600,
                        color: '#1a1b2e',
                        margin: 0,
                    }}
                >
                    Device approvals
                </h1>
            </div>

            <div
                style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: 13,
                    padding: '18px 22px',
                    marginBottom: 28,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                }}
            >
                <div
                    style={{
                        background: '#fef2e2',
                        borderRadius: 8,
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                    }}
                >
                    <SvgIcon
                        path="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"
                        color="#d97706"
                        size={18}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#78350f',
                            marginBottom: 4,
                        }}
                    >
                        Tier 4–5 device approval required
                    </div>
                    <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                        High-value devices require explicit staff approval before pickup. Approving
                        issues a pickup QR token; rejecting frees the request.
                    </div>
                </div>
                {list.length > 0 && (
                    <span
                        style={{
                            background: '#d97706',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: 20,
                            flexShrink: 0,
                            alignSelf: 'flex-start',
                        }}
                    >
                        {list.length} pending
                    </span>
                )}
            </div>

            {list.length === 0 ? (
                <Empty label="No pending device approvals." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {list.map((entry) => (
                        <div
                            key={entry.id}
                            style={{
                                background: '#fff',
                                border: '1px solid #e7e7ef',
                                borderRadius: 14,
                                padding: '20px 22px',
                                transition:
                                    'box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)';
                                e.currentTarget.style.borderColor = '#d0d0de';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = '#e7e7ef';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 14,
                                    alignItems: 'flex-start',
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: entry.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        fontSize: 15,
                                        fontWeight: 800,
                                        color: '#fff',
                                    }}
                                >
                                    {initialsOf(entry.userName)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: '#1a1b2e',
                                            marginBottom: 3,
                                        }}
                                    >
                                        {entry.userName || 'Member'}
                                    </div>
                                    <div
                                        style={{ fontSize: 12, color: '#7c7e93', marginBottom: 8 }}
                                    >
                                        Device request
                                    </div>
                                    <div
                                        style={{
                                            background: '#f8f8fc',
                                            border: '1px solid #e7e7ef',
                                            borderRadius: 9,
                                            padding: '12px 14px',
                                            display: 'flex',
                                            gap: 16,
                                            alignItems: 'center',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    color: '#9b9db2',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                    marginBottom: 3,
                                                }}
                                            >
                                                Device
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    color: '#1a1b2e',
                                                }}
                                            >
                                                {entry.title}
                                            </div>
                                        </div>
                                        <div
                                            style={{ width: 1, height: 32, background: '#e7e7ef' }}
                                        />
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    color: '#9b9db2',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                    marginBottom: 3,
                                                }}
                                            >
                                                Schedule
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: '#4b4d63',
                                                }}
                                            >
                                                {fmt(entry.startAt)} → {fmt(entry.endAt)}
                                            </div>
                                        </div>
                                    </div>
                                    {entry.message && (
                                        <div
                                            style={{
                                                marginTop: 10,
                                                fontSize: 12,
                                                color: '#78350f',
                                                background: '#fef4e6',
                                                border: '1px solid #fde49e',
                                                borderRadius: 8,
                                                padding: '8px 12px',
                                            }}
                                        >
                                            \u201c{entry.message}\u201d
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() =>
                                        askConfirm({
                                            title: 'Reject this request?',
                                            message: `Reject the device pickup request from ${entry.userName || 'this member'} for "${entry.title}"? The request will be freed and the member will be notified.`,
                                            confirmLabel: 'Reject',
                                            confirmColor: '#ef4444',
                                            onConfirm: () => reject(entry.id),
                                        })
                                    }
                                    style={{
                                        flex: 1,
                                        padding: '10px 0',
                                        borderRadius: 8,
                                        border: '1.5px solid #e7e7ef',
                                        background: '#fff',
                                        color: '#ef4444',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#fef2f2';
                                        e.currentTarget.style.borderColor = '#fecaca';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fff';
                                        e.currentTarget.style.borderColor = '#e7e7ef';
                                    }}
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() =>
                                        askConfirm({
                                            title: 'Approve pickup?',
                                            message: `Approve the device pickup for ${entry.userName || 'this member'}? A QR token will be issued for "${entry.title}".`,
                                            confirmLabel: 'Approve',
                                            confirmColor: '#16a34a',
                                            onConfirm: () => approve(entry.id),
                                        })
                                    }
                                    style={{
                                        flex: 2,
                                        padding: '10px 0',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#16a34a',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 10px rgba(22,163,74,.25)',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#15803d';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow =
                                            '0 4px 14px rgba(22,163,74,.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#16a34a';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow =
                                            '0 2px 10px rgba(22,163,74,.25)';
                                    }}
                                >
                                    Approve pickup
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
