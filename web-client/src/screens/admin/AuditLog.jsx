import { useState, useCallback } from 'react';
import { useApp } from '../../App';
import { useFetch } from '../../hooks/useFetch';
import { auditLogs as fetchAuditLogs } from '../../api/misc';
import { colorFor } from '../../api/adapters';
import { Loading, ErrorState } from '../../components/States';
import Pagination from '../../components/Pagination';

// Maps our UI category names to backend AuditTargetType values
const CATEGORY_TO_TARGET = {
    All: undefined,
    User: 'User',
    Booking: 'Booking',
    Borrowing: 'Borrowing',
    Waitlist: 'WaitlistEntry',
    Device: 'Device',
    Book: 'BookCopy',
    Config: 'SystemConfig',
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_TO_TARGET);

const DATE_PRESETS = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: 'custom', label: 'Custom range' },
];

function categoryFor(action, targetType) {
    const a = (action || '').toUpperCase();
    const t = (targetType || '').toLowerCase();
    if (a.startsWith('USER_') || t === 'user') return 'User';
    if (a.startsWith('BOOKING_') || t === 'booking') return 'Booking';
    if (
        a === 'ITEM_CHECKED_OUT' ||
        a === 'ITEM_RETURNED' ||
        a === 'ROOM_CHECKED_IN' ||
        t === 'borrowing'
    )
        return 'Borrowing';
    if (a.startsWith('WAITLIST_') || t === 'waitlistentry') return 'Waitlist';
    if (a.startsWith('DEVICE_') || t === 'device') return 'Device';
    if (a.startsWith('BOOK_') || t === 'bookcopy') return 'Book';
    if (a === 'CONFIG_UPDATED' || t === 'systemconfig') return 'Config';
    return 'Other';
}

function fmt(d) {
    try {
        return new Date(d).toLocaleString();
    } catch {
        return d;
    }
}

function getEventDescription(log) {
    const meta = log.metadata || {};
    const action = log.action || '';
    switch (action) {
        case 'CONFIG_UPDATED': {
            if (meta.differences) {
                const parts = [];
                const diffs = meta.differences;
                if (diffs.tiers?.length > 0) {
                    diffs.tiers.forEach((t) => {
                        const fieldChanges = [];
                        Object.entries(t.changes).forEach(([field, val]) => {
                            fieldChanges.push(`"${field}" from "${val.from}" to "${val.to}"`);
                        });
                        parts.push(`${t.tier} (${fieldChanges.join(', ')})`);
                    });
                }
                if (diffs.penalties?.length > 0) {
                    diffs.penalties.forEach((p) => {
                        parts.push(`penalty rule "${p.rule}" from "${p.from}" to "${p.to}"`);
                    });
                }
                if (diffs.toggles?.length > 0) {
                    diffs.toggles.forEach((t) => {
                        parts.push(
                            `toggle "${t.label}" from "${t.from ? 'ON' : 'OFF'}" to "${t.to ? 'ON' : 'OFF'}"`
                        );
                    });
                }
                if (parts.length > 0)
                    return `Updated system configuration. Changed: ${parts.join('; ')}`;
            }
            const keys = meta.patch ? Object.keys(meta.patch) : [];
            return keys.length > 0
                ? `Updated system configuration. Changed keys: ${keys.join(', ')}`
                : 'Updated system configuration.';
        }
        case 'USER_LOGGED_IN':
            return `User logged in: ${meta.name || '-'} (${meta.email || '-'})`;
        case 'USER_REGISTERED':
            return `Registered new user: ${meta.name || '-'} (${meta.email || '-'}) as ${meta.role || '-'}`;
        case 'USER_UPDATED':
            return `Updated user profile for ${meta.name || '-'} (${meta.email || '-'})`;
        case 'USER_ENABLED':
            return `Enabled account of ${meta.name || '-'} (${meta.email || '-'})`;
        case 'USER_DISABLED':
            return `Disabled account of ${meta.name || '-'} (${meta.email || '-'})`;
        case 'BOOKING_CREATED':
            return `Booking created for ${meta.userName || '-'}: ${meta.resourceType || '-'} "${meta.resourceName || '-'}"`;
        case 'BOOKING_APPROVED':
            return `Approved booking for ${meta.userName || '-'}: ${meta.resourceType || '-'} "${meta.resourceName || '-'}"`;
        case 'BOOKING_REJECTED':
            return `Rejected booking for ${meta.userName || '-'}: ${meta.resourceType || '-'} "${meta.resourceName || '-'}"`;
        case 'BOOKING_CANCELLED':
            return `Cancelled booking for ${meta.userName || '-'}: ${meta.resourceType || '-'} "${meta.resourceName || '-'}"${meta.adminOverride ? ' (by Admin)' : ''}`;
        case 'ITEM_CHECKED_OUT':
            return `Checked out ${meta.resourceType || '-'} "${meta.resourceName || '-'}" (Asset: ${meta.assetTag || '-'}) to ${meta.userName || '-'}`;
        case 'ROOM_CHECKED_IN':
            return `Checked in to room "${meta.resourceName || '-'}" for ${meta.userName || '-'}`;
        case 'ITEM_RETURNED':
            return `Returned ${meta.resourceType || '-'} "${meta.resourceName || '-'}" (Asset: ${meta.assetTag || '-'}) · Condition: ${meta.condition || '-'}`;
        case 'WAITLIST_ENQUEUED':
            return `${meta.userName || '-'} added to waitlist for ${meta.resourceType || '-'} "${meta.resourceName || '-'}" (Score: ${meta.priorityScore ?? '-'})`;
        case 'WAITLIST_PROMOTED':
            return `${meta.userName || '-'} promoted from waitlist for "${meta.resourceName || '-'}"${meta.staffNotes ? ` · ${meta.staffNotes}` : ''}`;
        case 'WAITLIST_DISMISSED':
            return `${meta.userName || '-'} dismissed from waitlist for "${meta.resourceName || '-'}"${meta.staffNotes ? ` · ${meta.staffNotes}` : ''}`;
        default:
            return 'Performed administrative action.';
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function startOfTodayISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function endOfNowISO() {
    return new Date().toISOString();
}

function dateParamsForPreset(preset, customFrom, customTo) {
    const now = new Date();
    switch (preset) {
        case 'today':
            return { startDate: startOfTodayISO(), endDate: endOfNowISO() };
        case '7d':
            return {
                startDate: new Date(now - 7 * 86400000).toISOString(),
                endDate: endOfNowISO(),
            };
        case '30d':
            return {
                startDate: new Date(now - 30 * 86400000).toISOString(),
                endDate: endOfNowISO(),
            };
        case 'custom':
            return {
                startDate: customFrom ? new Date(customFrom).toISOString() : undefined,
                endDate: customTo ? new Date(customTo + 'T23:59:59').toISOString() : undefined,
            };
        default:
            return {};
    }
}

export default function AuditLog() {
    const { showToast } = useApp();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [category, setCategory] = useState('All');
    const [datePreset, setDatePreset] = useState('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [idQuery, setIdQuery] = useState('');
    const [idInput, setIdInput] = useState('');
    const [sortOrder, setSortOrder] = useState('desc');

    const dateParams = dateParamsForPreset(datePreset, customFrom, customTo);
    const targetType = CATEGORY_TO_TARGET[category];

    const { data, loading, error, reload } = useFetch(
        () =>
            fetchAuditLogs({
                page,
                limit: pageSize,
                ...(targetType ? { targetType } : {}),
                ...dateParams,
                ...(idQuery ? { id: idQuery } : {}),
                sortOrder,
            }),
        [page, pageSize, category, datePreset, customFrom, customTo, idQuery, sortOrder]
    );

    const auditLogs = (data?.items || []).map((l) => {
        const cat = categoryFor(l.action, l.targetType);
        return {
            id: l.id,
            action: (l.action || '').replace(/_/g, ' '),
            actor: l.actor?.name ? `${l.actor.name} · ${l.actor.role}` : 'System',
            target: [l.targetType, l.targetId && String(l.targetId).slice(0, 8)]
                .filter(Boolean)
                .join(' · '),
            kind: cat,
            time: fmt(l.createdAt),
            col: colorFor(cat || l.targetType || l.action || 'x'),
            description: getEventDescription(l),
        };
    });

    const meta = data?.meta ?? {};
    const total = meta.total ?? 0;

    const gridCols = '7px 170px 1.8fr 1.8fr 2.6fr 100px 140px';

    function handleSearch() {
        setIdQuery(idInput.trim().toLowerCase());
        setPage(1);
    }

    async function copyId(id) {
        const ok = await copyToClipboard(String(id));
        showToast(ok ? `Copied ${String(id).slice(0, 8)}…` : 'Could not copy');
    }

    function changeFilter(key, value) {
        setPage(1);
        if (key === 'category') setCategory(value);
        if (key === 'date') setDatePreset(value);
        if (key === 'customFrom') setCustomFrom(value);
        if (key === 'customTo') setCustomTo(value);
    }

    return (
        <div
            style={{
                padding: '30px 30px 40px',
                fontFamily: "'Public Sans', sans-serif",
                minHeight: '100%',
            }}
        >
            <div style={{ marginBottom: 18 }}>
                <h1
                    style={{
                        fontFamily: "'Spectral', serif",
                        fontSize: 24,
                        fontWeight: 700,
                        color: '#1a1b2e',
                        margin: '0 0 4px',
                    }}
                >
                    Audit Log
                </h1>
                <p style={{ fontSize: 13, color: '#7c7e93', margin: 0 }}>{total} entries matched</p>
            </div>

            {/* Filters row */}
            <div
                style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                {/* Category dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={labelStyle}>Category</span>
                    <select
                        value={category}
                        onChange={(e) => changeFilter('category', e.target.value)}
                        style={selectStyle}
                    >
                        {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={labelStyle}>Date</span>
                    <select
                        value={datePreset}
                        onChange={(e) => changeFilter('date', e.target.value)}
                        style={selectStyle}
                    >
                        {DATE_PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Custom date range inputs */}
                {datePreset === 'custom' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => changeFilter('customFrom', e.target.value)}
                            style={dateInput}
                        />
                        <span style={{ fontSize: 12, color: '#7c7e93' }}>→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => changeFilter('customTo', e.target.value)}
                            style={dateInput}
                        />
                    </div>
                )}
            </div>

            {/* Log ID search */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
                <span style={labelStyle}>Log ID</span>
                <input
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Paste a log id (full or prefix)"
                    style={{ ...dateInput, width: 300, fontFamily: "'IBM Plex Mono', monospace" }}
                />
                <button onClick={handleSearch} style={searchBtn}>
                    Search
                </button>
                {idQuery && (
                    <button
                        onClick={() => {
                            setIdQuery('');
                            setIdInput('');
                            setPage(1);
                        }}
                        style={clearBtn}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div
                style={{
                    background: '#fff',
                    border: '1px solid #e7e7ef',
                    borderRadius: 14,
                    overflow: 'hidden',
                }}
            >
                {/* Header row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: gridCols,
                        padding: '10px 20px 10px 10px',
                        background: '#f8f8fc',
                        borderBottom: '1px solid #e7e7ef',
                        gap: 16,
                        alignItems: 'center',
                    }}
                >
                    <div />
                    {['Log ID', 'Actor / Action', 'Target', 'Description', 'Kind'].map((col) => (
                        <span key={col} style={thStyle}>
                            {col}
                        </span>
                    ))}
                    {/* Timestamp with sort toggle */}
                    <button
                        onClick={() => {
                            setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'));
                            setPage(1);
                        }}
                        style={{
                            ...thStyle,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: 0,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                        title={`Sort ${sortOrder === 'desc' ? 'oldest first' : 'newest first'}`}
                    >
                        Timestamp
                        <span style={{ fontSize: 10 }}>{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    </button>
                </div>

                {loading && (
                    <div
                        style={{
                            padding: '30px 20px',
                            textAlign: 'center',
                            color: '#9b9db2',
                            fontSize: 13,
                        }}
                    >
                        Loading…
                    </div>
                )}
                {error && !loading && (
                    <div
                        style={{
                            padding: '30px 20px',
                            textAlign: 'center',
                            color: '#ef4444',
                            fontSize: 13,
                        }}
                    >
                        Failed to load.{' '}
                        <button
                            onClick={reload}
                            style={{
                                color: '#16a34a',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}
                {!loading && !error && auditLogs.length === 0 && (
                    <div
                        style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#9b9db2',
                            fontSize: 13,
                        }}
                    >
                        No entries for this filter.
                    </div>
                )}

                {auditLogs.map((log, i) => {
                    const idStr = String(log.id);
                    const short = idStr.length > 12 ? idStr.slice(0, 8) + '…' : idStr;
                    return (
                        <div
                            key={log.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: gridCols,
                                gap: 16,
                                borderBottom:
                                    i < auditLogs.length - 1 ? '1px solid #f0f0f6' : 'none',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                style={{
                                    background: log.col,
                                    width: 7,
                                    alignSelf: 'stretch',
                                    minHeight: 56,
                                }}
                            />
                            <div style={{ padding: '14px 0' }}>
                                <button
                                    onClick={() => copyId(idStr)}
                                    title={`Copy log id\n${idStr}`}
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#16231b',
                                        background: '#f0f0f6',
                                        border: '1px solid #e7e7ef',
                                        borderRadius: 6,
                                        padding: '3px 8px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {short}
                                </button>
                            </div>
                            <div style={{ padding: '14px 0' }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#1a1b2e',
                                        marginBottom: 2,
                                    }}
                                >
                                    {log.action}
                                </div>
                                <div
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 11,
                                        color: '#9b9db2',
                                    }}
                                >
                                    {log.actor}
                                </div>
                            </div>
                            <div style={{ padding: '14px 0', fontSize: 12, color: '#3a3b4e' }}>
                                {log.target}
                            </div>
                            <div
                                style={{
                                    padding: '14px 0',
                                    fontSize: 12,
                                    color: '#3a3b4e',
                                    lineHeight: 1.4,
                                }}
                            >
                                {log.description}
                            </div>
                            <div style={{ padding: '14px 0' }}>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        background: log.col + '18',
                                        color: log.col,
                                        border: `1px solid ${log.col}40`,
                                        borderRadius: 20,
                                        padding: '3px 10px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                    }}
                                >
                                    {log.kind}
                                </span>
                            </div>
                            <div style={{ padding: '14px 20px 14px 0' }}>
                                <div
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: 11,
                                        color: '#3a3b4e',
                                    }}
                                >
                                    {log.time}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                    pageSizes={[10, 30, 50, 100]}
                />
            </div>
        </div>
    );
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: '#7c7e93', whiteSpace: 'nowrap' };

const selectStyle = {
    border: '1px solid #e7e7ef',
    borderRadius: 7,
    padding: '5px 28px 5px 10px',
    fontSize: 12,
    background: '#fff',
    fontFamily: "'Public Sans', sans-serif",
    color: '#1a1b2e',
    cursor: 'pointer',
    appearance: 'auto',
};

const dateInput = {
    border: '1px solid #e7e7ef',
    borderRadius: 7,
    padding: '5px 8px',
    fontSize: 12,
    background: '#fff',
    fontFamily: "'IBM Plex Mono', monospace",
};

const searchBtn = {
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
};

const clearBtn = {
    background: '#f0f0f6',
    border: 'none',
    color: '#7c7e93',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
};

const thStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#9b9db2',
    letterSpacing: 0.5,
};
