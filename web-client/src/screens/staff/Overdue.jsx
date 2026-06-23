import { useState } from 'react';
import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myNotifications, runOverdueSweep } from '../../api/misc';
import { Loading, ErrorState, Empty } from '../../components/States';

function SvgIcon({ path, color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path.split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}

function fmt(d) { try { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }

const TYPE_COL = {
  RECALL_FLAG: { bg: '#fef2e2', col: '#d97706' },
  OVERDUE_ADMIN_ALERT: { bg: '#fee2e2', col: '#ef4444' },
  default: { bg: '#f3f3f8', col: '#7c7e93' },
};

export default function Overdue() {
  const { showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => myNotifications({ limit: 50 }), []);
  const [sweeping, setSweeping] = useState(false);

  async function sweep() {
    setSweeping(true);
    try {
      const r = await runOverdueSweep();
      showToast(`Sweep done · ${r.borrowingsProcessed ?? 0} borrowings, ${r.noShowsProcessed ?? 0} no-shows`);
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  if (loading) return <Loading label="Loading overdue follow-ups…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Staff receive RECALL_FLAG / admin alerts from the overdue sweep.
  const items = (data?.items || []).filter((n) => /OVERDUE|RECALL|NO_SHOW/i.test(n.type));

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 3px' }}>Staff · Overdue</p>
          <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Overdue follow-ups</h1>
        </div>
        <button onClick={sweep} disabled={sweeping} style={{
          background: sweeping ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: 9,
          padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: sweeping ? 'default' : 'pointer',
        }}>
          {sweeping ? 'Running…' : 'Run overdue sweep'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 26 }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 20, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontFamily: "'IBM Plex Mono', monospace" }}>{items.length}</span>
          <span style={{ fontSize: 12, color: '#dc2626' }}>active alerts</span>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty label="No overdue alerts. Run the sweep to refresh recall flags." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
          {items.map((n) => {
            const c = TYPE_COL[n.type] || TYPE_COL.default;
            return (
              <div key={n.id} style={{ background: '#fff', border: '1px solid #e7e7ef', borderLeft: `4px solid ${c.col}`, borderRadius: 13, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ background: c.bg, color: c.col, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px' }}>{n.type.replace(/_/g, ' ')}</span>
                    <div style={{ fontSize: 13, color: '#4b4d63', lineHeight: 1.6, marginTop: 8 }}>{n.message}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9b9db2', flexShrink: 0 }}>{fmt(n.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: 'linear-gradient(125deg,#052e16 0%,#166534 100%)', borderRadius: 13, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SvgIcon path="M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" color="#86efac" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#86efac', marginBottom: 4 }}>Automated overdue job</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            The sweep marks late items, applies point penalties, sets recall flags at day 2, and escalates to admin at day 7 — notifying borrowers and staff. Run it manually here or let the scheduled job handle it.
          </div>
        </div>
      </div>
    </div>
  );
}
