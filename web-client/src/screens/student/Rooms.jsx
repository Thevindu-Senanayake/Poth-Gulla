import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { listRooms } from '../../api/catalogue';
import { Loading, ErrorState, Empty } from '../../components/States';

export default function Rooms() {
  const { openBooking } = useApp();
  const { data, loading, error, reload } = useFetch(() => listRooms(), []);

  if (loading) return <Loading label="Loading study rooms…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rooms = data?.items || [];

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, color: '#1a1b2e', margin: '0 0 4px' }}>Study Rooms</h1>
        <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>Reserve a quiet space — bookings route instantly unless the slot clashes.</p>
      </div>

      {rooms.length === 0 ? (
        <Empty label="No study rooms available." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 20 }}>
          {rooms.map((room) => {
            const isAvail = room.available > 0;
            return (
              <div key={room.id} style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: room.color, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h18v18H3zM9 3v18M15 9H3M15 15H3" />
                  </svg>
                </div>
                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 3 }}>{room.title}</div>
                  <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 12 }}>{room.author}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: isAvail ? '#059669' : '#db2777',
                      background: isAvail ? '#d7f8e9' : '#fce7f3',
                      borderRadius: 6, padding: '4px 9px',
                    }}>
                      {isAvail ? 'Available' : 'In use'}
                    </span>
                    <button
                      onClick={() => openBooking(room)}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      {isAvail ? 'Reserve →' : 'Join waitlist →'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        background: 'linear-gradient(125deg,#0c2a1a 0%,#166534 100%)',
        borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M14 21h3v-2" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>QR check-in earns points</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            Scan the QR code at the room entrance within 15 minutes of your booking start to confirm your session.
          </div>
        </div>
      </div>
    </div>
  );
}
