import { useMemo } from 'react';

// Slice an array for the current page. Kept in /hooks (separate from the
// Pagination component) so Vite Fast Refresh can hot-reload the component
// file without invalidating it ("consistent-components-exports" rule).
export function usePaginated(items, page, pageSize) {
    return useMemo(() => {
        const total = items?.length || 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * pageSize;
        const slice = (items || []).slice(start, start + pageSize);
        return { slice, total, totalPages, page: safePage, start };
    }, [items, page, pageSize]);
}
