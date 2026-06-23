import { useState } from 'react';
import { useApp } from '../../App';
import { scanCheckout, scanReturn } from '../../api/misc';

function SvgIcon({ path, color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path.split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e7e7ef',
  fontSize: 13, color: '#1a1b2e', fontFamily: "'IBM Plex Mono', monospace", outline: 'none', boxSizing: 'border-box', background: '#f8f8fc',
};

export default function Checkout() {
  const { staffScan, setStaffScan, showToast } = useApp();
  const [bookingQr, setBookingQr] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const isCheckout = staffScan.mode === 'checkout';

  function setMode(mode) {
    setStaffScan((prev) => ({ ...prev, mode, stage: 'ready' }));
    setResult(null); setBookingQr(''); setAssetTag('');
  }

  async function submit() {
    setBusy(true); setResult(null);
    try {
      if (isCheckout) {
        if (!bookingQr.trim() || !assetTag.trim()) throw new Error('Enter booking QR token and asset tag');
        const b = await scanCheckout(bookingQr.trim(), assetTag.trim());
        setResult({ ok: true, msg: `Checked out · booking ${String(b.id).slice(0, 8)}` });
        showToast('Checked out successfully');
      } else {
        if (!assetTag.trim()) throw new Error('Enter the asset tag to return');
        const b = await scanReturn(assetTag.trim(), condition);
        setResult({ ok: true, msg: `Return processed · borrowing ${String(b.id).slice(0, 8)}` });
        showToast('Return processed');
      }
      setBookingQr(''); setAssetTag('');
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Scan failed';
      setResult({ ok: false, msg });
      showToast(typeof msg === 'string' ? msg : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 12, color: '#7c7e93', margin: '0 0 3px' }}>Staff · Desk</p>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 26, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>Checkout / Return desk</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '24px 26px' }}>
          <div style={{ display: 'flex', background: '#f3f3f8', borderRadius: 10, padding: 4, gap: 4, marginBottom: 26 }}>
            {['checkout', 'return'].map((mode) => (
              <button key={mode} onClick={() => setMode(mode)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: staffScan.mode === mode ? '#16a34a' : 'transparent',
                color: staffScan.mode === mode ? '#fff' : '#7c7e93',
                boxShadow: staffScan.mode === mode ? '0 2px 8px rgba(22,163,74,.25)' : 'none',
              }}>
                {mode === 'checkout' ? 'Check out' : 'Return'}
              </button>
            ))}
          </div>

          {/* Scanner visual */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ width: 180, height: 180, background: '#0c1a12', borderRadius: 14, position: 'relative', overflow: 'hidden' }}>
              {[
                { top: 12, left: 12, borderTop: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { top: 12, right: 12, borderTop: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
                { bottom: 12, left: 12, borderBottom: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { bottom: 12, right: 12, borderBottom: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
              ].map((style, i) => <div key={i} style={{ position: 'absolute', width: 22, height: 22, borderRadius: 2, ...style }} />)}
              <div style={{ position: 'absolute', left: 16, right: 16, height: 2, background: 'linear-gradient(90deg, transparent, #22c55e, transparent)', animation: 'scanLine 2s ease-in-out infinite', top: '50%' }} />
              <style>{`@keyframes scanLine{0%{top:20px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:calc(100% - 20px);opacity:0}}`}</style>
            </div>
          </div>

          {/* Manual entry — the desk scanner writes into these fields */}
          {isCheckout ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5e72', display: 'block', marginBottom: 6 }}>Booking QR token</label>
              <input value={bookingQr} onChange={(e) => setBookingQr(e.target.value)} placeholder="qrToken from the member's booking" style={{ ...inputStyle, marginBottom: 14 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5e72', display: 'block', marginBottom: 6 }}>Asset tag</label>
              <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="e.g. BK-CC-001 / DEV-MBP-001" style={{ ...inputStyle, marginBottom: 18 }} />
            </>
          ) : (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5e72', display: 'block', marginBottom: 6 }}>Asset tag</label>
              <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="Scan the item's asset tag" style={{ ...inputStyle, marginBottom: 14 }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: '#5c5e72', display: 'block', marginBottom: 6 }}>Condition</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {['GOOD', 'DAMAGED'].map((c) => (
                  <button key={c} onClick={() => setCondition(c)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                    border: condition === c ? `1.5px solid ${c === 'GOOD' ? '#16a34a' : '#ef4444'}` : '1.5px solid #e7e7ef',
                    background: condition === c ? (c === 'GOOD' ? '#f0fdf4' : '#fee2e2') : '#fff',
                    color: condition === c ? (c === 'GOOD' ? '#16a34a' : '#ef4444') : '#7c7e93',
                  }}>{c === 'GOOD' ? 'Good' : 'Damaged'}</button>
                ))}
              </div>
            </>
          )}

          <button onClick={submit} disabled={busy} style={{
            width: '100%', background: busy ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: 9,
            padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', boxShadow: '0 3px 12px rgba(22,163,74,.3)',
          }}>
            {busy ? 'Processing…' : isCheckout ? 'Process checkout' : 'Process return'}
          </button>

          {result && (
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 9,
              background: result.ok ? '#dcfce7' : '#fee2e2', border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
            }}>
              <SvgIcon path={result.ok ? 'M5 12l4 4L19 6' : 'M18 6L6 18M6 6l12 12'} color={result.ok ? '#16a34a' : '#ef4444'} size={16} />
              <span style={{ fontSize: 13, fontWeight: 600, color: result.ok ? '#15803d' : '#b91c1c' }}>{result.msg}</span>
            </div>
          )}
        </div>

        {/* Right panel: how it works */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, padding: '22px 24px' }}>
          <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 16, fontWeight: 600, color: '#1a1b2e', margin: '0 0 16px' }}>How the desk works</h2>
          <ol style={{ margin: 0, paddingLeft: 18, color: '#4b4d63', fontSize: 13, lineHeight: 1.9 }}>
            <li><strong>Checkout</strong> — scan the member's <em>booking QR</em> (an APPROVED booking) then the item's <em>asset tag</em>. The copy/device is marked borrowed.</li>
            <li><strong>Return</strong> — scan the item's <em>asset tag</em> and pick a condition. Points are scored automatically and the next waitlist entry is auto-promoted.</li>
            <li>Tier 4–5 device requests must be approved under <strong>Device approvals</strong> before they can be checked out.</li>
          </ol>
          <div style={{ marginTop: 16, fontSize: 12, color: '#7c7e93', background: '#f8f8fc', border: '1px solid #e7e7ef', borderRadius: 9, padding: '12px 14px' }}>
            A hardware scanner simply types into the fields on the left — no camera integration required.
          </div>
        </div>
      </div>
    </div>
  );
}
