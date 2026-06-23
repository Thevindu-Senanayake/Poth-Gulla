import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { allBookings } from '../../api/bookings';
import { listAllResources } from '../../api/catalogue';
import { queue, promote, dismiss } from '../../api/waitlist';
import { Loading, ErrorState, Empty } from '../../components/States';

function SvgIcon({ path, color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path.split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}

// Aggregate the staff review data: all WAITLIST bookings -> unique resources -> ordered queues.
async function loadReview() {
  const [waitBookings, resources] = await Promise.all([
    allBookings({ status: 'WAITLIST' }),
    listAllResources(''),
  ]);
  const nameById = new Map(resources.map((r) => [r.id, r.title]));
  const msgByBooking = new Map(waitBookings.items.map((b) => [b.id, b.message]));

  // Unique (resourceType, resourceKey) pairs that currently have queued bookings.
  const seen = new Set();
  const pairs = [];
  for (const b of waitBookings.items) {
    const key = `${b.resourceType}:${b.resourceId}`;
    if (b.resourceId && !seen.has(key)) { seen.add(key); pairs.push({ type: b.resourceType, key: b.resourceId }); }
  }

  const queues = await Promise.all(pairs.map((p) => queue(p.type, p.key).catch(() => [])));
  const entries = [];
  queues.forEach((q, i) => {
    q.forEach((e) => entries.push({
      ...e,
      resourceName: nameById.get(pairs[i].key) || e.resourceType,
      message: msgByBooking.get(e.bookingId) || e.message || '',
    }));
  });
  return entries;
}

export default function WaitlistReview() {
  const { showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => loadReview(), []);

  if (loading) return <Loading label="Loading waitlist queues…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const entries = data || [];
  const flagged = entries.filter((e) => e.hasMessage);
  const autoQueue = entries.filter((e) => !e.hasMessage);

  async function doPromote(id) {
    try { await promote(id); showToast('Promoted — booking approved'); refresh(); }
    catch (e) { showToast(e?.response?.data?.message ?? 'Could not promote'); }
  }
  async function doDecline(id) {
    try { await dismiss(id); showToast('Entry dismissed'); refresh(); }
    catch (e) { showToast(e?.response?.data?.message ?? 'Could not dismiss'); }
  }

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 3px' }}>Staff · Waitlist</p>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Waitlist review</h1>
      </div>

      <div style={{ background: 'linear-gradient(125deg,#0c2a1a 0%,#15803d 100%)', borderRadius: 13, padding: '18px 22px', marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <SvgIcon path="M4 7h16M4 12h16M4 17h10" color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Flagging system</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
            Entries with a justification message pause auto-promotion and float to the top for review. Promote one to approve its booking and issue a pickup QR; message-free entries auto-promote on a free event.
          </div>
        </div>
      </div>

      {/* Flagged */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Flagged for review</h2>
          <span style={{ background: '#fef2e2', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, border: '1px solid #fcd34d' }}>{flagged.length} pending</span>
        </div>
        {flagged.length === 0 ? <Empty label="No message-flagged entries." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {flagged.map((entry) => (
              <div key={entry.id} style={{ background: '#fff', border: '1.5px solid #fcd34d', borderRadius: 13, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1b2e', marginBottom: 4 }}>{entry.resourceName}</div>
                    <span style={{ fontSize: 11, color: '#7c7e93', background: '#f3f3f8', borderRadius: 20, padding: '2px 8px' }}>{entry.resourceType}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: '#9b9db2', marginBottom: 3 }}>Priority</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{Math.round((entry.priorityScore ?? 0) * 10) / 10}</div>
                  </div>
                </div>
                {entry.message && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Member's justification</div>
                    <p style={{ fontSize: 13, color: '#78350f', margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>"{entry.message}"</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => doDecline(entry.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #e7e7ef', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Decline</button>
                  <button onClick={() => doPromote(entry.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 10px rgba(22,163,74,.25)' }}>Promote</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto queue */}
      <div>
        <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 14px' }}>Automatic queue</h2>
        {autoQueue.length === 0 ? <Empty label="No auto-promoting entries waiting." /> : (
          <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 13, overflow: 'hidden' }}>
            {autoQueue.map((entry, i) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < autoQueue.length - 1 ? '1px solid #f3f3f8' : 'none' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 800, color: '#9b9db2', width: 24, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1b2e', marginBottom: 2 }}>{entry.resourceName}</div>
                  <span style={{ fontSize: 11, color: '#7c7e93' }}>{entry.resourceType}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#9b9db2', marginBottom: 2 }}>Priority</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: '#7c7e93' }}>{Math.round((entry.priorityScore ?? 0) * 10) / 10}</div>
                </div>
                <button onClick={() => doPromote(entry.id)} style={{ fontSize: 11, color: '#16a34a', background: '#d7f8e9', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 12px', flexShrink: 0, cursor: 'pointer', fontWeight: 700 }}>Promote</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
