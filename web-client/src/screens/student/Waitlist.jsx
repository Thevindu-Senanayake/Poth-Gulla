import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myWaitlist } from '../../api/waitlist';
import { cancelBooking } from '../../api/bookings';
import { Loading, ErrorState } from '../../components/States';

export default function Waitlist() {
  const { showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => myWaitlist(), []);

  if (loading) return <Loading label="Loading your waitlist…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Adapt backend waitlist entries to the fields this view renders.
  const wlEntries = (data || []).map((w, i) => ({
    id: w.id,
    bookingId: w.bookingId,
    position: i + 1,
    title: w.title,
    author: w.resourceType,
    hasMessage: w.hasMessage,
    message: w.message,
    status: w.status === 'PENDING' ? 'In queue' : w.status,
    statusCol: '#16a34a',
    priorityScore: Math.round((w.priorityScore ?? 0) * 10) / 10,
  }));

  async function leave(entry) {
    try { await cancelBooking(entry.bookingId); showToast('Removed from waitlist'); refresh(); }
    catch (e) { showToast(e?.response?.data?.message ?? 'Could not leave waitlist'); }
  }

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, color: '#1a1b2e', margin: '0 0 4px' }}>Waitlist</h1>
        <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>Your current waitlist positions and priority scores</p>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'linear-gradient(125deg,#0c2a1a 0%,#166534 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>How priority is calculated</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: 8 }}>
            Your position in the queue is determined by a weighted score combining your tier standing and role type.
          </div>
          <code style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '5px 10px',
            color: '#86efac',
            display: 'inline-block',
          }}>
            priority = tier × 0.6 + role × 0.4
          </code>
        </div>
      </div>

      {/* Waitlist entries */}
      {wlEntries.map((entry) => (
        <div key={entry.id} style={{
          background: '#fff',
          border: '1px solid #e7e7ef',
          borderRadius: 14,
          padding: '22px 24px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Position + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{
                  width: 36, height: 36,
                  background: 'linear-gradient(135deg,#0c2a1a,#166534)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 800, color: '#fff' }}>
                    #{entry.position}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1b2e', lineHeight: 1.2 }}>{entry.title}</div>
                  <div style={{ fontSize: 12, color: '#7c7e93', marginTop: 2 }}>{entry.author}</div>
                </div>
              </div>

              {/* Justification message */}
              {entry.hasMessage && (
                <div style={{
                  background: '#fef4e6',
                  border: '1px solid #fde49e',
                  borderLeft: '3px solid #f59e0b',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginTop: 14,
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Your justification message
                  </div>
                  <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{entry.message}</p>
                </div>
              )}

              {/* Status */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: entry.statusCol + '1a',
                border: `1px solid ${entry.statusCol}40`,
                color: entry.statusCol,
                padding: '5px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 700,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.statusCol }} />
                {entry.status}
              </div>
            </div>

            {/* Priority score */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#9b9db2', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Priority</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 36, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{entry.priorityScore}</div>
              <div style={{ fontSize: 11, color: '#9b9db2', marginTop: 2 }}>out of 10</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f0f8', display: 'flex', gap: 8 }}>
            <button
              onClick={() => leave(entry)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1.5px solid #fee2e2', background: '#fff', color: '#ef4444',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Public Sans', sans-serif",
              }}>
              Leave waitlist
            </button>
          </div>
        </div>
      ))}

      {wlEntries.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 14, padding: '48px',
          textAlign: 'center', border: '1px solid #e7e7ef',
        }}>
          <div style={{ fontSize: 13, color: '#9b9db2' }}>You're not on any waitlists.</div>
        </div>
      )}
    </div>
  );
}
