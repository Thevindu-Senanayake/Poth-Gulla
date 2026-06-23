import { useFetch } from '../../hooks/useFetch';
import { listUsers } from '../../api/users';
import { allBookings } from '../../api/bookings';
import { listBooks, listDevices, listRooms } from '../../api/catalogue';
import { Loading, ErrorState } from '../../components/States';

const STAT_ICONS = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  book: 'M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z',
  scan: 'M9 11l3 3L22 4',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
};

const TIER_COL = { 1: '#ef4444', 2: '#d97706', 3: '#16a34a', 4: '#3b82f6', 5: '#8b5cf6' };

async function loadAdmin() {
  const [users, bookings, books, devices, rooms] = await Promise.all([
    listUsers({ limit: 100 }), allBookings({ limit: 100 }),
    listBooks({ limit: 1 }), listDevices({ limit: 1 }), listRooms(),
  ]);
  return { users: users.items, usersTotal: users.total, bookings: bookings.items,
    resTotal: (books.total || 0) + (devices.total || 0) + (rooms.items?.length || 0) };
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => loadAdmin(), []);
  if (loading) return <Loading label="Loading system overview…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { users, usersTotal, bookings, resTotal } = data;
  const activeMembers = users.filter((u) => u.isActive).length;
  const inProgress = bookings.filter((b) => ['APPROVED', 'PENDING'].includes(b.status)).length;
  const waitlisted = bookings.filter((b) => b.status === 'WAITLIST').length;

  const adminStats = [
    { label: 'Members', value: usersTotal, iconBg: '#dcfce7', iconColor: '#16a34a', iconPath: STAT_ICONS.users, trend: `${activeMembers} active`, trendColor: '#10b981' },
    { label: 'Resources', value: resTotal, iconBg: '#fce7f3', iconColor: '#db2777', iconPath: STAT_ICONS.book, trend: 'books · devices · rooms', trendColor: '#7c7e93' },
    { label: 'Loans in progress', value: inProgress, iconBg: '#d7f8e9', iconColor: '#059669', iconPath: STAT_ICONS.scan, trend: 'approved + pending', trendColor: '#10b981' },
    { label: 'On waitlist', value: waitlisted, iconBg: '#fef4e6', iconColor: '#f59e0b', iconPath: STAT_ICONS.clock, trend: 'queued requests', trendColor: '#d97706' },
  ];

  // 7-day booking bars from createdAt.
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }), n: 0 };
  });
  const dayMap = new Map(days.map((d) => [d.key, d]));
  bookings.forEach((b) => { const k = new Date(b.raw?.createdAt || b.startAt).toDateString(); if (dayMap.has(k)) dayMap.get(k).n++; });
  const maxN = Math.max(1, ...days.map((d) => d.n));

  // Tier distribution among patrons.
  const patrons = users.filter((u) => u.tierNum >= 1);
  const tierDist = [1, 2, 3, 4, 5].map((t) => {
    const n = patrons.filter((u) => u.tierNum === t).length;
    const pct = patrons.length ? Math.round((n / patrons.length) * 100) : 0;
    return { tier: `Tier ${t}`, pct: `${pct}%`, w: `${pct}%`, col: TIER_COL[t] };
  });

  // Booking status breakdown (replaces synthetic health panel).
  const statusBreak = ['APPROVED', 'PENDING', 'WAITLIST', 'COMPLETED', 'CANCELLED'].map((s) => ({
    label: s.charAt(0) + s.slice(1).toLowerCase(),
    n: bookings.filter((b) => b.status === s).length,
  }));

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 700, color: '#1a1b2e', margin: '0 0 4px' }}>Admin Dashboard</h1>
        <p style={{ fontSize: 13, color: '#7c7e93', margin: 0 }}>System overview · Poth Gulla Smart Library</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {adminStats.map((stat, i) => (
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '22px 24px' }}>
          <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 20px' }}>Bookings — last 7 days</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
            {days.map((bar, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9b9db2' }}>{bar.n}</span>
                <div style={{ width: '100%', height: `${Math.max(8, (bar.n / maxN) * 110)}px`, background: 'linear-gradient(180deg,#22c55e,#15803d)', borderRadius: '5px 5px 2px 2px' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9b9db2', fontWeight: 600 }}>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '22px 24px' }}>
          <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 18px' }}>Member tier distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tierDist.map((tier, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#3a3b4e', fontWeight: 600 }}>{tier.tier}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: tier.col, fontWeight: 700 }}>{tier.pct}</span>
                </div>
                <div style={{ background: '#f0f0f6', borderRadius: 20, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: tier.w, height: '100%', background: tier.col, borderRadius: 20, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '22px 24px' }}>
        <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: '0 0 18px' }}>Bookings by status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {statusBreak.map((h, i) => (
            <div key={i} style={{ background: '#f8f8fc', border: '1px solid #e7e7ef', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 800, color: '#1a1b2e', marginBottom: 2 }}>{h.n}</div>
              <div style={{ fontSize: 12, color: '#7c7e93', fontWeight: 600 }}>{h.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
