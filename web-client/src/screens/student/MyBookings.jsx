import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myBookings, cancelBooking } from '../../api/bookings';
import { BOOK_ICON, DEVICE_ICON, ROOM_ICON } from '../../api/adapters';
import { Loading, ErrorState, Empty } from '../../components/States';

const ICON = { BOOK: BOOK_ICON, DEVICE: DEVICE_ICON, ROOM: ROOM_ICON };

function Cover({ resourceType, color, w = 52, h = 64 }) {
  const path = ICON[resourceType] || BOOK_ICON;
  return (
    <div style={{ width: w, height: h, background: color, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={w * 0.44} height={h * 0.36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {path.split('M').filter(Boolean).map((d, j) => <path key={j} d={'M' + d} />)}
      </svg>
    </div>
  );
}

function fmt(d) {
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return d; }
}

export default function MyBookings() {
  const { setBookingModal, showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => myBookings(), []);

  if (loading) return <Loading label="Loading your bookings…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const all = data?.items || [];
  const active = all.filter((b) => b.status === 'APPROVED');
  const upcoming = all.filter((b) => b.status === 'PENDING' || b.status === 'WAITLIST');
  const history = all.filter((b) => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status));

  function showQR(b) {
    setBookingModal({ open: true, stage: 'loanQR', resource: b, loanTitle: b.title, loanMeta: b.statusLabel, loanToken: b.qrToken || 'PENDING' });
  }

  async function doCancel(b) {
    try { await cancelBooking(b.id); showToast('Booking cancelled'); refresh(); }
    catch (e) { showToast(e?.response?.data?.message ?? 'Could not cancel'); }
  }

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, color: '#1a1b2e', margin: '0 0 4px' }}>My Bookings</h1>
        <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>Active loans, pending requests and history</p>
      </div>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 16px' }}>
          Active loans
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 400, color: '#9b9db2', marginLeft: 8 }}>{active.length} active</span>
        </h2>
        {active.length === 0 ? <Empty label="No active loans." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map((b) => (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 13, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <Cover resourceType={b.resourceType} color={b.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 8, textTransform: 'capitalize' }}>{b.type}</div>
                  <div style={{ fontSize: 12, color: '#5a5c74' }}>{fmt(b.startAt)} → {fmt(b.endAt)}</div>
                </div>
                <button onClick={() => showQR(b)} style={{ background: '#0c2a1a', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Show QR</button>
                <button onClick={() => doCancel(b)} style={{ background: '#f4f4f8', color: '#ef4444', border: 'none', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 16px' }}>Pending & waitlisted</h2>
        {upcoming.length === 0 ? <Empty label="Nothing pending." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {upcoming.map((b) => (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 13, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <Cover resourceType={b.resourceType} color={b.color} w={42} h={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1b2e', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 8 }}>{fmt(b.startAt)} → {fmt(b.endAt)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: b.statusCol, background: b.statusBg, borderRadius: 6, padding: '3px 8px' }}>{b.statusLabel}</span>
                </div>
                <button onClick={() => doCancel(b)} style={{ background: '#f4f4f8', color: '#ef4444', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 16px' }}>History</h2>
        {history.length === 0 ? <Empty label="No past bookings yet." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {history.map((b) => (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 13, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Cover resourceType={b.resourceType} color={b.color} w={38} h={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: '#9b9db2' }}>{fmt(b.startAt)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: b.statusCol, background: b.statusBg, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{b.statusLabel}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
