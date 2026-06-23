import { useApp } from '../App';

const BOOK_SVG = "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z";

const NAV_STUDENT = [
  { key: 'dashboard',  label: 'Dashboard',       d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { key: 'search',     label: 'Catalogue',        d: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" },
  { key: 'mybookings', label: 'My Bookings',      d: "M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" },
  { key: 'waitlist',   label: 'Waitlist',         d: "M4 7h16M4 12h16M4 17h10", badge: '1' },
  { key: 'recommend',  label: 'Recommendations',  d: "M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" },
  { key: 'points',     label: 'Points & Tier',    d: "M12 17.5l-5 3 1.5-5.5-4.5-3.5 5.5-.5L12 6l2 5.5 5.5.5-4.5 3.5 1.5 5.5z" },
  { key: 'rooms',      label: 'Study Rooms',      d: "M3 3h18v18H3zM9 3v18" },
  { key: 'profile',    label: 'Profile',          d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

const NAV_LECTURER = [
  { key: 'dashboard',  label: 'Dashboard',       d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { key: 'search',     label: 'Catalogue',        d: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" },
  { key: 'mybookings', label: 'My Bookings',      d: "M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" },
  { key: 'waitlist',   label: 'Waitlist',         d: "M4 7h16M4 12h16M4 17h10", badge: '1' },
  { key: 'recommend',  label: 'Recommendations',  d: "M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" },
  { key: 'points',     label: 'Points & Tier',    d: "M12 17.5l-5 3 1.5-5.5-4.5-3.5 5.5-.5L12 6l2 5.5 5.5.5-4.5 3.5 1.5 5.5z" },
  { key: 'profile',    label: 'Profile',          d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

const NAV_STAFF = [
  { key: 'staffDash',      label: 'Dashboard',        d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { key: 'checkout',       label: 'Checkout / Return', d: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6" },
  { key: 'waitlistReview', label: 'Waitlist Review',  d: "M4 5h16v11H7l-3 3z", badge: '2' },
  { key: 'approvals',      label: 'Device Approvals', d: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z", badge: '2' },
  { key: 'overdue',        label: 'Overdue',          d: "M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z", badge: '23' },
  { key: 'manage',         label: 'Manage Resources', d: "M4 7h16M4 12h16M4 17h10" },
  { key: 'profile',        label: 'Profile',          d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

const NAV_ADMIN = [
  { key: 'adminDash',      label: 'Overview',          d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { key: 'users',          label: 'Users',             d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" },
  { key: 'audit',          label: 'Audit Log',         d: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { key: 'config',         label: 'Config',            d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" },
  { key: 'adminResources', label: 'Resources',         d: "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z" },
  { key: 'profile',        label: 'Profile',           d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

const ROLE_LABEL_MAP = {
  student: 'Student',
  lecturer: 'Lecturer',
  staff: 'Library Staff',
  admin: 'Administrator',
};

function NavItem({ item, active, onClick }) {
  return (
    <button
      onClick={() => onClick(item.key)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        background: active
          ? 'linear-gradient(135deg,#16a34a,#22c55e 55%,#4ade80)'
          : 'transparent',
        color: active ? '#fff' : '#5c5e72',
        fontWeight: active ? 600 : 500,
        fontSize: 13.5,
        textAlign: 'left',
        boxShadow: active ? '0 4px 14px rgba(22,163,74,.28)' : 'none',
        transition: 'all .15s',
        position: 'relative',
      }}
    >
      <svg
        width="17" height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}
      >
        {item.d.split('M').filter(Boolean).map((seg, i) => (
          <path key={i} d={'M' + seg} />
        ))}
      </svg>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span style={{
          background: active ? 'rgba(255,255,255,.28)' : '#ef4444',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 20,
          minWidth: 18,
          textAlign: 'center',
        }}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar() {
  const { currentRole, page, setPage, user, logout } = useApp();

  const navMap = {
    student: NAV_STUDENT,
    lecturer: NAV_LECTURER,
    staff: NAV_STAFF,
    admin: NAV_ADMIN,
  };

  const navItems = navMap[currentRole] || NAV_STUDENT;

  const initials = user?.initials || '??';
  const avatarBg = user?.avatarBg || '#7c7e93';
  const userName = user?.name || 'User';
  const roleLabel = ROLE_LABEL_MAP[currentRole] || 'User';

  return (
    <div style={{
      width: 248,
      background: '#fff',
      borderRight: '1px solid #e7e7ef',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid #f0f0f8',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg,#16a34a,#22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(22,163,74,.25)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={BOOK_SVG} />
            <path d="M5 19a1 1 0 0 1 1-1h13" />
          </svg>
        </div>
        <div>
          <div style={{
            fontFamily: 'Spectral, Georgia, serif',
            fontWeight: 700,
            fontSize: 17,
            color: '#16231b',
            letterSpacing: '-.2px',
          }}>
            Poth Gulla
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9.5,
            color: '#9b9db2',
            marginTop: 1,
          }}>
            Library System
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{
        flex: 1,
        padding: '12px 12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {navItems.map(item => (
          <NavItem
            key={item.key}
            item={item}
            active={page === item.key}
            onClick={setPage}
          />
        ))}
      </div>

      {/* User card */}
      <div style={{
        borderTop: '1px solid #f0f0f8',
        padding: '14px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16231b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userName}
          </div>
          <div style={{ fontSize: 11, color: '#9b9db2', marginTop: 1 }}>
            {roleLabel}
          </div>
        </div>
        {/* Logout button */}
        <button
          onClick={logout}
          title="Sign out"
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            border: 'none',
            background: '#f4f4f8',
            color: '#7c7e93',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f4f4f8'; e.currentTarget.style.color = '#7c7e93'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
