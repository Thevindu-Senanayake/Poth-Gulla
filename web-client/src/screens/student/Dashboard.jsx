import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myBookings } from '../../api/bookings';
import { myWaitlist } from '../../api/waitlist';
import { BOOK_ICON, DEVICE_ICON, ROOM_ICON } from '../../api/adapters';
import { Loading, ErrorState } from '../../components/States';

const ICON = { BOOK: BOOK_ICON, DEVICE: DEVICE_ICON, ROOM: ROOM_ICON };

function fmt(d) {
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return d; }
}

const STAT_ICONS = {
  loans: 'M4 5h16v15H4zM4 9h16M9 3v4M15 3v4',
  waitlist: 'M4 7h16M4 12h16M4 17h10',
  points: 'M12 17.5l-5 3 1.5-5.5-4.5-3.5 5.5-.5L12 6l2 5.5 5.5.5-4.5 3.5 1.5 5.5z',
  tier: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z',
};

export default function Dashboard() {
  const { user, setPage } = useApp();
  const { data, loading, error, reload } = useFetch(
    () => Promise.all([myBookings(), myWaitlist()]).then(([b, w]) => ({ bookings: b.items, waitlist: w })),
    []
  );

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const bookings = data?.bookings || [];
  const waitlist = data?.waitlist || [];
  const activeLoans = bookings.filter((b) => b.status === 'APPROVED');
  const pending = bookings.filter((b) => b.status === 'PENDING');

  const pts = user.points ?? 0;
  const tierNum = user.tier ?? 3;
  const TIER_FLOORS = { 1: 0, 2: 200, 3: 500, 4: 1000, 5: 2000 };
  const nextFloor = TIER_FLOORS[Math.min(tierNum + 1, 5)] ?? 2000;
  const toNext = Math.max(0, nextFloor - pts);
  const progressPct = tierNum >= 5 ? '100%' : `${Math.min(100, Math.round((pts / nextFloor) * 100))}%`;

  const stats = [
    { label: 'Active loans', value: activeLoans.length, iconBg: '#d7f8e9', iconColor: '#059669', iconPath: STAT_ICONS.loans, trend: `${pending.length} pending`, trendColor: '#7c7e93' },
    { label: 'On waitlist', value: waitlist.length, iconBg: '#fce7f3', iconColor: '#db2777', iconPath: STAT_ICONS.waitlist, trend: 'queued requests', trendColor: '#7c7e93' },
    { label: 'Points', value: pts, iconBg: '#fef4e6', iconColor: '#f59e0b', iconPath: STAT_ICONS.points, trend: `${toNext} to next tier`, trendColor: '#d97706' },
    { label: 'Tier', value: user.tierLabel, iconBg: '#dbeafe', iconColor: '#2563eb', iconPath: STAT_ICONS.tier, trend: tierNum >= 5 ? 'max tier' : 'keep earning', trendColor: '#7c7e93' },
  ];

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(125deg,#0c2a1a 0%,#15803d 60%,#22c55e 100%)', borderRadius: 16, padding: '30px 34px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 4px' }}>Welcome back</p>
          <h1 style={{ fontFamily: "'Spectral', serif", color: '#fff', fontSize: 27, fontWeight: 600, margin: '0 0 16px', lineHeight: 1.2 }}>{user.name}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
              {user.tierLabel} · {pts} pts
            </span>
            <span style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
              {activeLoans.length} active loans
            </span>
            {user.role === 'lecturer' && (
              <span style={{ background: '#f59e0b', color: '#1c1000', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>FACULTY PRIORITY</span>
            )}
          </div>
          <button onClick={() => setPage('search')} style={{ background: '#fff', color: '#0c2a1a', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Browse catalogue
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 13, padding: '18px 20px' }}>
            <div style={{ background: stat.iconBg, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stat.iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {stat.iconPath.split('M').filter(Boolean).map((d, j) => <path key={j} d={'M' + d} />)}
              </svg>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 700, color: '#1a1b2e', marginBottom: 2 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: stat.trendColor, fontWeight: 600 }}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18 }}>
        {/* Active loans */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Active loans</h2>
            <button onClick={() => setPage('mybookings')} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>View all →</button>
          </div>
          {activeLoans.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9b9db2', padding: '14px 0' }}>No active loans right now.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeLoans.map((loan) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 54, background: loan.color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {(ICON[loan.resourceType] || BOOK_ICON).split('M').filter(Boolean).map((d, j) => <path key={j} d={'M' + d} />)}
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1b2e', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.title}</div>
                    <div style={{ fontSize: 12, color: '#7c7e93', textTransform: 'capitalize' }}>{loan.type}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: '#059669' }}>Due {fmt(loan.endAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '20px 22px' }}>
            <h3 style={{ fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, color: '#1a1b2e', margin: '0 0 14px' }}>Your tier progress</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#7c7e93', fontWeight: 600 }}>{user.tierLabel}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{pts} pts</span>
            </div>
            <div style={{ background: '#fef4e6', borderRadius: 20, height: 8, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: progressPct, height: '100%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 20, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#9b9db2' }}>
              {tierNum >= 5 ? 'You are at the top tier 🎉' : <><span style={{ color: '#d97706', fontWeight: 600 }}>{toNext} pts</span> to Tier {tierNum + 1}</>}
            </div>
          </div>

          {waitlist.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,#0c2a1a 0%,#166534 100%)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 800, color: '#fff' }}>#1</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Waitlist update</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{waitlist[0].title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{waitlist[0].resourceType}</div>
              <div style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#fcd34d', fontWeight: 600 }}>
                In queue · priority {Math.round((waitlist[0].priorityScore ?? 0) * 10) / 10}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
