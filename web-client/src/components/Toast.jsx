import { useApp } from '../App';

export default function Toast({ msg }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#16a34a',
      color: '#fff',
      padding: '12px 22px',
      borderRadius: 12,
      font: "600 14px 'Public Sans'",
      zIndex: 999,
      boxShadow: '0 8px 24px rgba(22,163,74,.3)',
      animation: 'pg-toast .2s ease both',
      whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}
