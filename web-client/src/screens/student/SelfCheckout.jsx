import { useState } from 'react';
import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myBookings } from '../../api/bookings';
import { selfCheckoutBook } from '../../api/scan';
import { Loading, ErrorState, Empty } from '../../components/States';
import ResourceImage from '../../components/ResourceImage';
import QRScanner from '../../components/QRScanner';

// Surface the real backend message + status so QA can match the failure
// against a server log line. Special-cases 404 with a clear "endpoint not
// deployed yet" message because self-checkout is the only frontend feature
// that depends on a brand-new backend route.
function selfCheckoutError(e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    const raw = (typeof data === 'string' && data) || data?.message || data?.error || e?.message;
    if (status === 404) {
        return "Self-checkout endpoint isn't available yet (404). Please ask the front desk to scan you out.";
    }
    if (status === 401 || status === 403) {
        return "Your account isn't authorised for self-checkout. Please use the front desk.";
    }
    if (status === 400 && /asset|tag|copy/i.test(String(raw || ''))) {
        return `Asset tag not recognised - ${raw}`;
    }
    return raw ? `${raw}${status ? ` (HTTP ${status})` : ''}` : 'Could not complete checkout.';
}

export default function SelfCheckout() {
    const { showToast, refresh } = useApp();
    const { data, loading, error, reload } = useFetch(() => myBookings(), []);

    const [scanning, setScanning] = useState(false);
    const [assetTag, setAssetTag] = useState('');
    const [busy, setBusy] = useState(false);
    const [lastError, setLastError] = useState(null);

    if (loading) return <Loading label="Loading your approved books…" />;
    if (error) return <ErrorState error={error} onRetry={reload} />;

    const approvedBooks = (data?.items || []).filter(
        (b) => b.status === 'APPROVED' && (b.resourceType === 'BOOK' || b.type === 'book')
    );

    async function submit(tag) {
        const t = (tag ?? assetTag).trim();
        if (!t) {
            showToast('Enter or scan an asset tag');
            return;
        }
        setBusy(true);
        setLastError(null);
        try {
            const res = await selfCheckoutBook(t);
            showToast(`Checked out · ${res?.bookTitle?.title || t}`);
            setAssetTag('');
            setScanning(false);
            refresh();
            reload();
        } catch (e) {
            const msg = selfCheckoutError(e);
            setLastError(msg);
            showToast(msg);
        } finally {
            setBusy(false);
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
            <div style={{ marginBottom: 24 }}>
                <h1
                    style={{
                        fontFamily: "'Spectral', serif",
                        fontSize: 24,
                        fontWeight: 600,
                        color: '#1a1b2e',
                        margin: '0 0 4px',
                    }}
                >
                    Self-checkout
                </h1>
                <p style={{ fontSize: 13, color: '#7c7e93', margin: 0 }}>
                    Scan the QR sticker on a book to complete checkout without staff. Only books
                    from your approved bookings are eligible.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
                {/* Approved books */}
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #e7e7ef',
                        borderRadius: 14,
                        padding: '20px 22px',
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 14px',
                        }}
                    >
                        Pending checkout · {approvedBooks.length}
                    </h2>
                    {approvedBooks.length === 0 ? (
                        <Empty label="No approved books waiting for pickup." />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {approvedBooks.map((b) => (
                                <div
                                    key={b.id}
                                    style={{
                                        display: 'flex',
                                        gap: 12,
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #e7e7ef',
                                        background: '#f8fafc',
                                    }}
                                >
                                    <ResourceImage
                                        imageUrl={b.imageUrl}
                                        resourceType="BOOK"
                                        color={b.color}
                                        w={40}
                                        h={50}
                                        radius={6}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#1a1b2e',
                                            }}
                                        >
                                            {b.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#7c7e93' }}>
                                            Approved · ready for pickup
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Scan / asset-tag input */}
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #e7e7ef',
                        borderRadius: 14,
                        padding: '20px 22px',
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#1a1b2e',
                            margin: '0 0 12px',
                        }}
                    >
                        Scan asset tag
                    </h2>

                    {scanning ? (
                        <>
                            <QRScanner
                                onDetect={(val) => submit(val)}
                                onError={() => setScanning(false)}
                            />
                            <button
                                onClick={() => setScanning(false)}
                                style={{
                                    width: '100%',
                                    marginTop: 14,
                                    background: '#f0f0f6',
                                    color: '#3a3b4e',
                                    border: 'none',
                                    borderRadius: 9,
                                    padding: '11px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Stop camera
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setScanning(true)}
                                disabled={approvedBooks.length === 0}
                                style={{
                                    width: '100%',
                                    background:
                                        approvedBooks.length === 0
                                            ? '#86efac'
                                            : 'linear-gradient(135deg,#16a34a,#22c55e)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 9,
                                    padding: '12px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: approvedBooks.length === 0 ? 'default' : 'pointer',
                                    marginBottom: 16,
                                }}
                            >
                                Scan with camera
                            </button>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: '#9b9db2',
                                    textAlign: 'center',
                                    marginBottom: 10,
                                }}
                            >
                                OR enter the asset tag printed on the book
                            </div>
                            <input
                                value={assetTag}
                                onChange={(e) => setAssetTag(e.target.value)}
                                placeholder="e.g. BK-CC-001"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submit();
                                }}
                                style={{
                                    width: '100%',
                                    border: '1.5px solid #e7e7ef',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    fontSize: 13,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    background: '#f8f8fc',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    marginBottom: 10,
                                }}
                            />
                            <button
                                onClick={() => submit()}
                                disabled={busy || approvedBooks.length === 0}
                                style={{
                                    width: '100%',
                                    background:
                                        busy || approvedBooks.length === 0 ? '#86efac' : '#0c2a1a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 9,
                                    padding: '11px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor:
                                        busy || approvedBooks.length === 0 ? 'default' : 'pointer',
                                }}
                            >
                                {busy ? 'Checking out…' : 'Check out'}
                            </button>

                            {lastError && (
                                <div
                                    style={{
                                        marginTop: 14,
                                        padding: '10px 12px',
                                        borderRadius: 9,
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        color: '#b91c1c',
                                        fontSize: 12,
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {lastError}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
