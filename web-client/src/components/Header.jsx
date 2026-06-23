import { useState } from 'react';
import { useApp } from '../App';

const PAGE_META = {
  dashboard:      { title: 'Dashboard',            sub: null },
  search:         { title: 'Catalogue',             sub: 'Browse books, devices & study rooms' },
  mybookings:     { title: 'My Bookings',           sub: 'Manage your active loans and reservations' },
  waitlist:       { title: 'Waitlist',              sub: 'Your position and priority score' },
  recommend:      { title: 'Recommendations',       sub: 'Personalised suggestions for you' },
  points:         { title: 'Points & Tier',         sub: 'Your standing and how to grow it' },
  rooms:          { title: 'Study Rooms',           sub: 'Book a quiet space to focus' },
  profile:        { title: 'Profile',               sub: 'Your account and activity log' },
  staffDash:      { title: 'Operations Dashboard',  sub: "Today's desk overview" },
  checkout:       { title: 'Checkout / Return',     sub: 'Scan a QR code to process a loan' },
  waitlistReview: { title: 'Waitlist Review',       sub: 'Message-flagged entries need your decision' },
  approvals:      { title: 'Device Approvals',      sub: 'High-value Tier 4–5 device requests' },
  overdue:        { title: 'Overdue Management',    sub: 'Items past their return date' },
  manage:         { title: 'Manage Resources',      sub: 'Add, update status, manage copies' },
  adminDash:      { title: 'System Overview',       sub: 'Platform-wide health and activity' },
  users:          { title: 'User Management',       sub: 'Filter, sort, edit and add members' },
  audit:          { title: 'Audit Log',             sub: 'Append-only system event trail' },
  config:         { title: 'System Config',         sub: 'Edit rules, thresholds and feature switches' },
  adminResources: { title: 'Resource Catalogue',    sub: 'Books, devices and rooms — copy-level management' },
  resource:       { title: 'Resource Detail',       sub: 'Full resource information and booking' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export default function Header() {
  const { page, searchQuery, setSearchQuery, notifOpen, setNotifOpen, user } = useApp();
  const [focused, setFocused] = useState(false);

  const meta = PAGE_META[page] || { title: 'Dashboard', sub: null };

  const subtitle = page === 'dashboard'
    ? `Good ${getGreeting()}, ${user?.name?.split(' ')[0] ?? 'there'}`
    : meta.sub;

  return (
    <div style={{
      height: 64,
      background: '#fff',
      borderBottom: '1px solid #e7e7ef',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Page title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#16231b', lineHeight: 1.2 }}>
          {meta.title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, fontWeight: 500, color: '#7c7e93', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Search input */}
      <div style={{
        position: 'relative',
        width: 300,
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          left: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9b9db2',
          pointerEvents: 'none',
          display: 'flex',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search resources…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '8px 12px 8px 34px',
            borderRadius: 10,
            border: focused ? '1.5px solid #16a34a' : '1.5px solid transparent',
            background: '#f2f2f8',
            fontSize: 13,
            color: '#16231b',
            outline: 'none',
            transition: 'border-color .15s',
          }}
        />
      </div>

      {/* Notification bell */}
      <button
        onClick={() => setNotifOpen(o => !o)}
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 10,
          border: 'none',
          background: notifOpen ? '#f0fdf4' : '#f4f4f8',
          color: notifOpen ? '#16a34a' : '#5c5e72',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background .15s, color .15s',
        }}
        onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.background = '#e8e8f0'; } }}
        onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = '#f4f4f8'; } }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Red dot */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          background: '#ef4444',
          borderRadius: '50%',
          border: '1.5px solid #fff',
        }} />
      </button>
    </div>
  );
}
