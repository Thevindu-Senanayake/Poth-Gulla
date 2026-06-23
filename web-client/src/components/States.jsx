// Shared loading / error / empty placeholders used by data-backed screens.

export function Loading({ label = 'Loading…' }) {
  return (
    <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontWeight: 600, fontSize: 14, fontFamily: "'Public Sans', sans-serif" }}>
      <span style={{
        width: 16, height: 16, marginRight: 10, borderRadius: '50%',
        border: '2.5px solid #bbf7d0', borderTopColor: '#16a34a',
        display: 'inline-block', animation: 'pg-spin .7s linear infinite',
      }} />
      {label}
      <style>{`@keyframes pg-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: 30, fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{
        background: '#fff', border: '1px solid #fecaca', borderRadius: 14,
        padding: '20px 24px', maxWidth: 560,
      }}>
        <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>Couldn’t load this</div>
        <div style={{ fontSize: 13, color: '#7c7e93', marginBottom: 14 }}>{String(error)}</div>
        {onRetry && (
          <button onClick={onRetry} style={{
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9,
            padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>Retry</button>
        )}
      </div>
    </div>
  );
}

export function Empty({ label = 'Nothing here yet' }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9b9db2', fontSize: 14, fontFamily: "'Public Sans', sans-serif" }}>
      {label}
    </div>
  );
}
