import { useEffect, useRef, useState } from 'react';
import { myWaitlist } from '../api/waitlist';
import { allBookings } from '../api/bookings';

const POLL_MS = 60_000;

export function useBadgeCounts(role, refreshKey) {
    const [counts, setCounts] = useState({});
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;
        async function load() {
            try {
                if (role === 'student' || role === 'lecturer') {
                    const w = await myWaitlist();
                    if (!cancelledRef.current) setCounts({ '/waitlist': (w || []).length });
                } else if (role === 'staff') {
                    const { items } = await allBookings({ limit: 200 });
                    const now = Date.now();
                    const overdue = items.filter(
                        (b) =>
                            b.status === 'CHECKED_OUT' &&
                            b.endAt &&
                            new Date(b.endAt).getTime() < now
                    ).length;
                    const waitlistReview = items.filter((b) => b.status === 'WAITLIST').length;
                    const deviceApprovals = items.filter(
                        (b) =>
                            b.status === 'PENDING' &&
                            (b.resourceType === 'DEVICE' || b.type === 'device')
                    ).length;
                    if (!cancelledRef.current)
                        setCounts({
                            '/staff/overdue': overdue,
                            '/staff/waitlist-review': waitlistReview,
                            '/staff/approvals': deviceApprovals,
                        });
                } else if (!cancelledRef.current) {
                    setCounts({});
                }
            } catch {
                /* keep last known counts */
            }
        }
        if (!role) {
            setCounts({});
            return () => {};
        }
        load();
        const id = setInterval(load, POLL_MS);
        return () => {
            cancelledRef.current = true;
            clearInterval(id);
        };
    }, [role, refreshKey]);

    return counts;
}
