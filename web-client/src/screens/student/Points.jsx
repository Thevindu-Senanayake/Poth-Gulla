import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myPoints } from '../../api/points';
import { Loading, ErrorState } from '../../components/States';

const TIER_META = [
  { tier: 'Tier 1', label: 'Restricted', range: '0–199', col: '#ef4444', floor: 0 },
  { tier: 'Tier 2', label: 'Basic', range: '200–499', col: '#d97706', floor: 200 },
  { tier: 'Tier 3', label: 'Regular', range: '500–999', col: '#16a34a', floor: 500 },
  { tier: 'Tier 4', label: 'Trusted', range: '1,000–1,999', col: '#3b82f6', floor: 1000 },
  { tier: 'Tier 5', label: 'Elite', range: '2,000+', col: '#8b5cf6', floor: 2000 },
];

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

export default function Points() {
  const { user } = useApp();
  const { data, loading, error, reload } = useFetch(() => myPoints(), []);

  const pts = user?.points ?? 0;
  const tierNum = user?.tier ?? 3;
  const cur = TIER_META[Math.min(Math.max(tierNum, 1), 5) - 1];
  const nextFloor = TIER_META[Math.min(tierNum, 4)]?.floor ?? 2000;
  const toNext = Math.max(0, nextFloor - pts);
  const nextTierAt = nextFloor;
  const progressPct = tierNum >= 5 ? '100%' : `${Math.min(100, Math.round((pts / nextFloor) * 100))}%`;
  const tierLabel = `${cur.tier} · ${cur.label}`;

  const tiers = TIER_META.map((t, i) => ({
    tier: t.tier, label: t.label, range: t.range, col: t.col,
    cur: i === tierNum - 1 ? t.col + '14' : 'transparent',
    curBorder: i === tierNum - 1 ? t.col + '55' : '#f0f0f6',
  }));

  // Reference table of how points move (matches backend scoring).
  const pointEvents = [
    { action: 'Book returned early (3+ days)', delta: '+50', positive: true },
    { action: 'Book returned on time', delta: '+25', positive: true },
    { action: 'Device returned early / on time', delta: '+40 / +30', positive: true },
    { action: 'Room attended (QR check-in)', delta: '+20', positive: true },
    { action: 'Review submitted', delta: '+15', positive: true },
    { action: 'Book late (per day)', delta: '−20', positive: false },
    { action: 'Device late', delta: '−80 to −160', positive: false },
    { action: 'Room no-show', delta: '−150', positive: false },
    { action: 'Device returned damaged', delta: '−300', positive: false },
  ];

  if (loading) return <Loading label="Loading your points…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const pointHistory = (data?.items || []).map((e) => ({
    action: (e.action || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    date: fmtDate(e.createdAt),
    delta: e.delta > 0 ? `+${e.delta}` : `${e.delta}`,
    positive: e.delta >= 0,
  }));

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, color: '#1a1b2e', margin: '0 0 4px' }}>Points &amp; Tiers</h1>
        <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>Track your standing and see how to earn more points</p>
      </div>

      {/* Top row: left hero card + right tier ladder */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>

        {/* Left: dark green points card */}
        <div style={{
          background: 'linear-gradient(135deg,#0c2a1a 0%,#14532d 60%,#166534 100%)',
          borderRadius: 16,
          padding: '28px 30px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              {tierLabel}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
              {pts.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>
              total points earned
            </div>

            {/* Amber progress bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Progress to {user?.nextTierLabel || 'Tier 4'}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#fcd34d', fontWeight: 700 }}>{progressPct}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, height: 9, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: progressPct,
                  background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                  borderRadius: 20,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{pts} pts</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{nextTierAt.toLocaleString()} pts</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              color: '#fcd34d',
              fontWeight: 600,
              marginTop: 12,
            }}>
              {toNext} points to {user?.nextTierLabel || 'Tier 4'}
            </div>
          </div>
        </div>

        {/* Right: tier ladder */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 16, padding: '22px 24px' }}>
          <h3 style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, color: '#1a1b2e', margin: '0 0 16px' }}>Tier ladder</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tiers.map((t, i) => {
              const isCurrent = t.cur !== 'transparent';
              return (
                <div key={i} style={{
                  background: isCurrent ? t.cur : '#fafafa',
                  border: `1.5px solid ${isCurrent ? t.curBorder : '#f0f0f6'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.col, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: '#1a1b2e' }}>{t.tier} · {t.label}</div>
                    <div style={{ fontSize: 11, color: '#9b9db2' }}>{t.range}</div>
                  </div>
                  {isCurrent && (
                    <span style={{
                      background: t.col + '28',
                      color: t.col,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: 20,
                      flexShrink: 0,
                    }}>
                      You
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: events table + recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Left: how points are earned & lost */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f8' }}>
            <h3 style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>How points are earned &amp; lost</h3>
          </div>
          {pointEvents.map((e, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 20px',
              borderBottom: i < pointEvents.length - 1 ? '1px solid #f8f8fc' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: e.positive ? '#16a34a' : '#ef4444',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: '#3a3b52' }}>{e.action}</span>
              </div>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: e.positive ? '#16a34a' : '#ef4444',
                flexShrink: 0,
              }}>
                {e.delta}
              </span>
            </div>
          ))}
        </div>

        {/* Right: recent activity */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f8' }}>
            <h3 style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Recent activity</h3>
          </div>
          {pointHistory.map((h, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 20px',
              borderBottom: i < pointHistory.length - 1 ? '1px solid #f8f8fc' : 'none',
            }}>
              <div style={{
                width: 32, height: 32,
                background: h.positive ? '#d7f8e9' : '#fee2e2',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: h.positive ? '#16a34a' : '#ef4444' }}>
                  {h.positive ? '+' : '−'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1b2e', lineHeight: 1.3 }}>{h.action}</div>
                <div style={{ fontSize: 11, color: '#9b9db2', marginTop: 2 }}>{h.date}</div>
              </div>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: h.positive ? '#16a34a' : '#ef4444',
                flexShrink: 0,
              }}>
                {h.delta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
