import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { auditLogs as fetchAuditLogs } from '../../api/misc';
import { colorFor } from '../../api/adapters';
import { Loading, ErrorState } from '../../components/States';

const FILTER_CHIPS = ['All', 'User', 'Booking', 'Borrowing', 'WaitlistEntry', 'Device', 'BookCopy'];

function fmt(d) { try { return new Date(d).toLocaleString(); } catch { return d; } }

export default function AuditLog() {
  const { auditFilter, setAuditFilter } = useApp();
  const { data, loading, error, reload } = useFetch(() => fetchAuditLogs({ limit: 100 }), []);

  if (loading) return <Loading label="Loading audit log…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const auditLogs = (data?.items || []).map((l) => ({
    id: l.id,
    action: (l.action || '').replace(/_/g, ' '),
    actor: l.actor?.name ? `${l.actor.name} · ${l.actor.role}` : 'System',
    target: [l.targetType, l.targetId && String(l.targetId).slice(0, 8)].filter(Boolean).join(' · '),
    kind: l.targetType || 'System',
    time: fmt(l.createdAt),
    ip: l.metadata?.ip || '—',
    col: colorFor(l.targetType || l.action || 'x'),
  }));

  const filtered = auditFilter === 'All' ? auditLogs : auditLogs.filter((log) => log.kind === auditFilter);

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 700, color: '#1a1b2e', margin: '0 0 4px' }}>Audit Log</h1>
        <p style={{ fontSize: 13, color: '#7c7e93', margin: 0 }}>{auditLogs.length} entries</p>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'linear-gradient(120deg,#0c2a1a 0%,#14532d 100%)',
        borderRadius: 12,
        padding: '13px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Append-only log</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginLeft: 8 }}>
            All actions are immutably recorded. No entry can be edited or deleted.
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setAuditFilter(chip)}
            style={{
              background: auditFilter === chip ? '#16a34a' : '#fff',
              color: auditFilter === chip ? '#fff' : '#3a3b4e',
              border: `1px solid ${auditFilter === chip ? '#16a34a' : '#e7e7ef'}`,
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            {chip}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '7px 2fr 2fr 120px 160px',
          padding: '10px 20px 10px 10px',
          background: '#f8f8fc',
          borderBottom: '1px solid #e7e7ef',
          gap: 16,
          alignItems: 'center',
        }}>
          <div />
          {['Actor / Action', 'Target', 'Kind', 'Timestamp · IP'].map(col => (
            <span key={col} style={{ fontSize: 11, fontWeight: 700, color: '#9b9db2', textTransform: 'uppercase', letterSpacing: 0.5 }}>{col}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9b9db2', fontSize: 13 }}>No entries for this filter.</div>
        )}
        {filtered.map((log, i) => (
          <div
            key={log.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '7px 2fr 2fr 120px 160px',
              gap: 16,
              borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f6' : 'none',
              alignItems: 'center',
            }}>

            {/* Colored left bar */}
            <div style={{ background: log.col, width: 7, alignSelf: 'stretch', minHeight: 56 }} />

            {/* Actor + action */}
            <div style={{ padding: '14px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1b2e', marginBottom: 2 }}>{log.action}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#9b9db2' }}>{log.actor}</div>
            </div>

            {/* Target */}
            <div style={{ padding: '14px 0', fontSize: 12, color: '#3a3b4e', lineHeight: 1.4 }}>{log.target}</div>

            {/* Kind badge */}
            <div style={{ padding: '14px 0' }}>
              <span style={{
                display: 'inline-block',
                background: log.col + '18',
                color: log.col,
                border: `1px solid ${log.col}40`,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {log.kind}
              </span>
            </div>

            {/* Timestamp + IP */}
            <div style={{ padding: '14px 20px 14px 0' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#3a3b4e', marginBottom: 2 }}>{log.time}</div>
              <div style={{ fontSize: 11, color: '#9b9db2' }}>{log.ip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
