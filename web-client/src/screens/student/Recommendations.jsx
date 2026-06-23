import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { myRecommendations } from '../../api/misc';
import { Loading, ErrorState, Empty } from '../../components/States';

function RecCard({ item }) {
  const { setSelectedResource, setPage } = useApp();

  function viewBook() {
    setSelectedResource(item);
    setPage('resource');
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div style={{ width: 46, height: 56, background: item.color, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1b2e', lineHeight: 1.3 }}>{item.title}</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#d7f8e9', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>
              {item.available > 0 ? 'Available' : 'Waitlist'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#7c7e93' }}>{item.author}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#5a5c74', lineHeight: 1.65, margin: '0 0 14px' }}>
        {item.blurb || `Matches your reading history${item.tags?.length ? ' · ' + item.tags.slice(0, 3).join(', ') : ''}.`}
      </p>
      <button onClick={viewBook} style={{ padding: '7px 14px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        View &amp; Book
      </button>
    </div>
  );
}

export default function Recommendations() {
  const { data, loading, error, reload } = useFetch(() => myRecommendations(12), []);

  if (loading) return <Loading label="Finding books for you…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const recs = data || [];

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 600, color: '#1a1b2e', margin: '0 0 4px' }}>Recommendations</h1>
        <p style={{ color: '#7c7e93', fontSize: 13, margin: 0 }}>Personalised picks based on the tags of books you’ve borrowed</p>
      </div>

      {recs.length === 0 ? (
        <Empty label="No recommendations yet — borrow and return a few books to get tailored picks." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {recs.map((item) => <RecCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
