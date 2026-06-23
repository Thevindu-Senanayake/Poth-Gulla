export default function QRCode({ cells, size = 200 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Corner finder pattern: top-left */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 44, height: 44,
        border: '6px solid #0c2a1a',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
        background: '#fff',
      }}>
        <div style={{ width: 14, height: 14, background: '#0c2a1a', borderRadius: 1 }} />
      </div>
      {/* Corner finder pattern: top-right */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 44, height: 44,
        border: '6px solid #0c2a1a',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
        background: '#fff',
      }}>
        <div style={{ width: 14, height: 14, background: '#0c2a1a', borderRadius: 1 }} />
      </div>
      {/* Corner finder pattern: bottom-left */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: 44, height: 44,
        border: '6px solid #0c2a1a',
        borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2,
        background: '#fff',
      }}>
        <div style={{ width: 14, height: 14, background: '#0c2a1a', borderRadius: 1 }} />
      </div>
      {/* QR cell grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(11,1fr)',
        gridTemplateRows: 'repeat(11,1fr)',
        gap: 2,
        width: size,
        height: size,
      }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: c.bg, borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}
