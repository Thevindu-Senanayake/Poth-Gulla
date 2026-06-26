import { useState } from 'react';
import { useApp } from '../../App';
import { roomCheckin } from '../../api/misc';
import QRScanner from '../../components/QRScanner';

// Staff-side room QR check-in.
//
// Calls the same POST /scan/room-checkin endpoint the student-side page
// uses. The current backend handler attaches the check-in to the
// authenticated caller, so this scans the staff member in (handy when a
// staff member needs to claim a room for setup / cleaning).
//
// To check a STUDENT in on the staff's behalf, the backend needs to evolve
// to accept an optional `forUserId` on /scan/room-checkin (or expose a
// new /scan/room-checkin-for route gated to LIBRARY_STAFF / ADMIN). The
// "Check in a member" panel here surfaces that need clearly to staff.
export default function StaffRoomCheckin() {
    const { showToast, refresh } = useApp();
    const [scanning, setScanning] = useState(false);
    const [roomQr, setRoomQr] = useState('');
    const [busy, setBusy] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    async function submit(value) {
        const v = (value ?? roomQr).trim();
        if (!v) {
            showToast('Scan or enter a room code');
            return;
        }
        setBusy(true);
        try {
            const res = await roomCheckin(v);
            const roomName = res?.studyRoom?.name || res?.title || 'the room';
            showToast(`Checked into ${roomName}`);
            setLastResult({ ok: true, name: roomName, id: res?.id });
            setRoomQr('');
            setScanning(false);
            refresh();
        } catch (e) {
            const data = e?.response?.data;
            const status = e?.response?.status;
            const base =
                (typeof data === 'string' && data) ||
                data?.message ||
                data?.error ||
                e?.message ||
                'Could not check into this room.';
            const msg = status ? `${base} (HTTP ${status})` : base;
            showToast(msg);
            setLastResult({ ok: false, msg });
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
                <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 3px' }}>Staff · Desk</p>
                <h1
                    style={{
                        fontFamily: "'Spectral', serif",
                        fontSize: 26,
                        fontWeight: 600,
                        color: '#1a1b2e',
                        margin: 0,
                    }}
                >
                    Room Check-in
                </h1>
                <p style={{ fontSize: 13, color: '#7c7e93', margin: '6px 0 0' }}>
                    Scan the QR sticker on a study-room door to claim it for a walk-up session.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
                {/* Scanner / input */}
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #e7e7ef',
                        borderRadius: 14,
                        padding: '22px 24px',
                    }}
                >
                    {scanning ? (
                        <>
                            <QRScanner
                                onDetect={(v) => submit(v)}
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
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '14px',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    marginBottom: 16,
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                Scan room QR
                            </button>

                            <label
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#5c5e72',
                                    display: 'block',
                                    marginBottom: 6,
                                }}
                            >
                                Room code
                            </label>
                            <input
                                value={roomQr}
                                onChange={(e) => setRoomQr(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submit();
                                }}
                                placeholder="e.g. ROOM-POD-A-12345"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1.5px solid #e7e7ef',
                                    fontSize: 13,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    color: '#1a1b2e',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    background: '#f8f8fc',
                                    marginBottom: 10,
                                }}
                            />
                            <button
                                onClick={() => submit()}
                                disabled={busy}
                                style={{
                                    width: '100%',
                                    background: busy ? '#86efac' : '#0c2a1a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 9,
                                    padding: '11px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: busy ? 'default' : 'pointer',
                                }}
                            >
                                {busy ? 'Checking in…' : 'Check in'}
                            </button>
                        </>
                    )}

                    {lastResult && (
                        <div
                            style={{
                                marginTop: 16,
                                padding: '10px 12px',
                                borderRadius: 9,
                                fontSize: 12,
                                background: lastResult.ok ? '#f0fdf4' : '#fef2f2',
                                color: lastResult.ok ? '#166534' : '#b91c1c',
                                border: `1px solid ${lastResult.ok ? '#bbf7d0' : '#fecaca'}`,
                            }}
                        >
                            {lastResult.ok
                                ? `Checked into ${lastResult.name}.${
                                      lastResult.id
                                          ? ` Booking ${String(lastResult.id).slice(0, 8)}.`
                                          : ''
                                  }`
                                : lastResult.msg}
                        </div>
                    )}
                </div>

                {/* Notes / how it works */}
                <div
                    style={{
                        background: 'linear-gradient(135deg,#0c2a1a 0%,#15803d 100%)',
                        borderRadius: 14,
                        padding: '22px 24px',
                        color: '#fff',
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "'Spectral', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            margin: '0 0 12px',
                        }}
                    >
                        How room check-in works
                    </h2>
                    <ol
                        style={{
                            fontSize: 13,
                            lineHeight: 1.65,
                            paddingLeft: 18,
                            margin: '0 0 14px',
                            color: 'rgba(255,255,255,.85)',
                        }}
                    >
                        <li>Scan the QR sticker on the study-room door.</li>
                        <li>
                            System creates a same-day reservation and marks it{' '}
                            <code style={{ color: '#86efac' }}>CHECKED_OUT</code>.
                        </li>
                        <li>
                            If the room is already booked, the response says by whom and when it
                            frees up.
                        </li>
                    </ol>
                    <div
                        style={{
                            background: 'rgba(255,255,255,.08)',
                            border: '1px solid rgba(255,255,255,.15)',
                            borderRadius: 9,
                            padding: '10px 12px',
                            fontSize: 11.5,
                            color: 'rgba(255,255,255,.78)',
                            lineHeight: 1.5,
                        }}
                    >
                        <strong style={{ color: '#fff' }}>Heads-up:</strong> the current
                        <code style={{ color: '#86efac', margin: '0 4px' }}>
                            /scan/room-checkin
                        </code>
                        endpoint check-ins under the caller's account — so this attaches the room to{' '}
                        <em>you</em>. To scan a student in at the desk, the backend needs a{' '}
                        <code style={{ color: '#86efac' }}>forUserId</code> parameter on this route.
                    </div>
                </div>
            </div>
        </div>
    );
}
