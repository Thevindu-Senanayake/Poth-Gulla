import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myBookings, cancelBooking, getBooking } from '../../api/bookings';
import { Loading, ErrorState, Empty } from '../../components/States';
import ResourceImage from '../../components/ResourceImage';

const TYPE_META = {
    BOOK: { label: 'Book', col: '#1d4ed8', bg: '#dbeafe' },
    DEVICE: { label: 'Device', col: '#7c3aed', bg: '#ede9fe' },
    ROOM: { label: 'Study Room', col: '#0d9488', bg: '#ccfbf1' },
};

function typeChip(b) {
    const key = (b.resourceType || b.type || '').toUpperCase();
    const meta = TYPE_META[key] || { label: key || '-', col: '#3a3b4e', bg: '#f0f0f6' };
    return (
        <span
            style={{
                fontSize: 11,
                fontWeight: 700,
                color: meta.col,
                background: meta.bg,
                border: `1px solid ${meta.col}25`,
                borderRadius: 6,
                padding: '2px 8px',
            }}
        >
            {meta.label}
        </span>
    );
}

function Cover({ imageUrl, resourceType, color, w = 52, h = 64 }) {
    return (
        <ResourceImage
            imageUrl={imageUrl}
            resourceType={resourceType}
            color={color}
            w={w}
            h={h}
            radius={7}
        />
    );
}

function fmt(d) {
    try {
        return new Date(d).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return d;
    }
}

export default function MyBookings() {
    const { setBookingModal, showToast, refresh } = useApp();
    const { data, loading, error, reload } = useFetch(() => myBookings(), []);

    if (loading) return <Loading label="Loading your bookings…" />;
    if (error) return <ErrorState error={error} onRetry={reload} />;

    const all = data?.items || [];
    const pendingCheckout = all.filter((b) => b.status === 'APPROVED');
    const activeLoans = all.filter((b) => b.status === 'CHECKED_OUT');
    // PENDING = awaiting staff approval (high-tier devices/books). WAITLIST entries
    // have their own dedicated Waitlist page and are not shown here.
    const upcoming = all.filter((b) => b.status === 'PENDING');
    const history = all.filter((b) => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status));

    async function showQR(b) {
        let token = b.assetTag;
        if (!token) {
            try {
                const fresh = await getBooking(b.id);
                token = fresh?.assetTag || fresh?.qrToken;
            } catch {
                /* fall through */
            }
        }
        if (!token) token = b.qrToken;

        setBookingModal({
            open: true,
            stage: 'loanQR',
            resource: b,
            loanTitle: b.title,
            loanMeta: b.statusLabel,
            loanToken: token || 'PENDING',
        });
    }

    async function doCancel(b) {
        try {
            await cancelBooking(b.id);
            showToast('Booking cancelled');
            refresh();
        } catch (e) {
            showToast(e?.response?.data?.message ?? 'Could not cancel');
        }
    }

    function BookingRow({ b, qrLabel, accent }) {
        return (
            <div
                key={b.id}
                className="pg-card-list"
                style={{
                    background: '#fff',
                    border: `1px solid ${accent ? '#bbf7d0' : '#e7e7ef'}`,
                    borderLeft: accent ? `4px solid ${accent}` : '1px solid #e7e7ef',
                    borderRadius: 13,
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                <Cover imageUrl={b.imageUrl} resourceType={b.resourceType} color={b.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#1a1b2e',
                            marginBottom: 4,
                        }}
                    >
                        {b.title}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8,
                        }}
                    >
                        {typeChip(b)}
                    </div>
                    <div style={{ fontSize: 12, color: '#5a5c74' }}>
                        {fmt(b.startAt)} → {fmt(b.endAt)}
                    </div>
                </div>
                {qrLabel && (
                    <button
                        onClick={() => showQR(b)}
                        style={{
                            background: accent || '#0c2a1a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 9,
                            padding: '10px 18px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {qrLabel}
                    </button>
                )}
                <button
                    onClick={() => doCancel(b)}
                    style={{
                        background: '#f4f4f8',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: 9,
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
            </div>
        );
    }

    // Sections only render when they have items. History is the catch-all and
    // gets a friendly "no past bookings yet" when empty. When everything is
    // empty we show a single hero empty state so the page never looks broken.
    const everythingEmpty =
        pendingCheckout.length === 0 &&
        activeLoans.length === 0 &&
        upcoming.length === 0 &&
        history.length === 0;

    return (
        <div
            style={{
                padding: '30px 30px 40px',
                fontFamily: "'Public Sans', sans-serif",
                minHeight: '100%',
            }}
        >
            <div style={{ marginBottom: 28 }}>
                <h1
                    style={{
                        fontFamily: "'Spectral', serif",
                        fontSize: 24,
                        fontWeight: 600,
                        color: '#1a1b2e',
                        margin: '0 0 4px',
                    }}
                >
                    My Bookings
                </h1>
                <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>
                    Pending checkouts, active loans, pending approvals and history
                </p>
            </div>

            {everythingEmpty && (
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #e7e7ef',
                        borderRadius: 14,
                        padding: '40px 22px',
                        textAlign: 'center',
                        color: '#7c7e93',
                    }}
                >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                    <div
                        style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 4 }}
                    >
                        You have no bookings yet
                    </div>
                    <div style={{ fontSize: 13 }}>
                        Head to the Catalogue to borrow your first book, device or room.
                    </div>
                </div>
            )}

            {pendingCheckout.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 6px',
                        }}
                    >
                        Pending checkout
                        <span
                            style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 13,
                                fontWeight: 400,
                                color: '#9b9db2',
                                marginLeft: 8,
                            }}
                        >
                            {pendingCheckout.length} ready
                        </span>
                    </h2>
                    <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 14px' }}>
                        Books: scan the QR via Self Checkout. Devices & rooms: bring the QR to the
                        front desk.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {pendingCheckout.map((b) => (
                            <BookingRow
                                key={b.id}
                                b={b}
                                qrLabel="Show checkout QR"
                                accent="#16a34a"
                            />
                        ))}
                    </div>
                </section>
            )}

            {activeLoans.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 16px',
                        }}
                    >
                        Active loans
                        <span
                            style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: 13,
                                fontWeight: 400,
                                color: '#9b9db2',
                                marginLeft: 8,
                            }}
                        >
                            {activeLoans.length} active
                        </span>
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {activeLoans.map((b) => (
                            <BookingRow key={b.id} b={b} qrLabel="Show QR" />
                        ))}
                    </div>
                </section>
            )}

            {upcoming.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 16px',
                        }}
                    >
                        Pending approval
                    </h2>
                    <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 14px' }}>
                        High-tier device or resource requests waiting for staff review.
                    </p>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                        }}
                    >
                        {upcoming.map((b) => (
                            <div
                                key={b.id}
                                className="pg-card-list"
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e7e7ef',
                                    borderRadius: 13,
                                    padding: '16px 18px',
                                    display: 'flex',
                                    gap: 14,
                                    alignItems: 'flex-start',
                                }}
                            >
                                <Cover
                                    imageUrl={b.imageUrl}
                                    resourceType={b.resourceType}
                                    color={b.color}
                                    w={42}
                                    h={42}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#1a1b2e',
                                            marginBottom: 4,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {b.title}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginBottom: 6,
                                        }}
                                    >
                                        {typeChip(b)}
                                    </div>
                                    <div
                                        style={{ fontSize: 12, color: '#7c7e93', marginBottom: 8 }}
                                    >
                                        {fmt(b.startAt)} → {fmt(b.endAt)}
                                    </div>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: b.statusCol,
                                            background: b.statusBg,
                                            borderRadius: 6,
                                            padding: '3px 8px',
                                        }}
                                    >
                                        {b.statusLabel}
                                    </span>
                                </div>
                                <button
                                    onClick={() => doCancel(b)}
                                    style={{
                                        background: '#f4f4f8',
                                        color: '#ef4444',
                                        border: 'none',
                                        borderRadius: 8,
                                        padding: '7px 12px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {history.length > 0 && (
                <section>
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 16px',
                        }}
                    >
                        History
                    </h2>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                        }}
                    >
                        {history.map((b) => (
                            <div
                                key={b.id}
                                className="pg-card-list"
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e7e7ef',
                                    borderRadius: 13,
                                    padding: '14px 16px',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'center',
                                }}
                            >
                                <Cover
                                    imageUrl={b.imageUrl}
                                    resourceType={b.resourceType}
                                    color={b.color}
                                    w={38}
                                    h={38}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#1a1b2e',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {b.title}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            alignItems: 'center',
                                            marginTop: 3,
                                        }}
                                    >
                                        {typeChip(b)}
                                        <span style={{ fontSize: 11, color: '#9b9db2' }}>
                                            {fmt(b.createdAt || b.startAt)}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: b.statusCol,
                                        background: b.statusBg,
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                        flexShrink: 0,
                                    }}
                                >
                                    {b.statusLabel}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
