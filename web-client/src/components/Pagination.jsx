const PAGE_SIZES = [10, 25, 50];

export default function Pagination({
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    pageSizes = PAGE_SIZES,
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const to = Math.min(total, safePage * pageSize);

    const go = (p) => onPageChange(Math.min(totalPages, Math.max(1, p)));

    const pages = [];
    const window = 1;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= safePage - window && i <= safePage + window)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '…') {
            pages.push('…');
        }
    }

    const btn = (active, disabled) => ({
        background: active ? '#16a34a' : '#fff',
        color: active ? '#fff' : disabled ? '#c4c5d4' : '#3a3b4e',
        border: '1px solid #e7e7ef',
        borderRadius: 7,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 32,
    });

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: '#f8f8fc',
                borderTop: '1px solid #e7e7ef',
                gap: 12,
                flexWrap: 'wrap',
                fontFamily: "'Public Sans', sans-serif",
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#7c7e93',
                }}
            >
                <span style={{ fontWeight: 600 }}>Rows per page:</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
                    style={{
                        border: '1px solid #e7e7ef',
                        borderRadius: 7,
                        padding: '5px 8px',
                        fontSize: 12,
                        background: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    {pageSizes.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <span style={{ marginLeft: 8 }}>
                    {from}-{to} of {total}
                </span>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                    onClick={() => go(safePage - 1)}
                    disabled={safePage <= 1}
                    style={btn(false, safePage <= 1)}
                >
                    ‹
                </button>
                {pages.map((p, i) =>
                    p === '…' ? (
                        <span
                            key={`e${i}`}
                            style={{ fontSize: 12, color: '#9b9db2', padding: '0 4px' }}
                        >
                            …
                        </span>
                    ) : (
                        <button key={p} onClick={() => go(p)} style={btn(p === safePage, false)}>
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => go(safePage + 1)}
                    disabled={safePage >= totalPages}
                    style={btn(false, safePage >= totalPages)}
                >
                    ›
                </button>
            </div>
        </div>
    );
}
