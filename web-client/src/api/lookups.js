import { listUsers } from './users';
import { listBooks, listDevices, listRooms } from './catalogue';

// Bookings from GET /bookings carry only IDs (no user/resource relations), so staff views
// resolve names client-side. This loads the lookup maps once and returns helper getters.
export async function loadLookups() {
  const [users, books, devices, rooms] = await Promise.all([
    listUsers({ limit: 100 }).catch(() => ({ items: [] })),
    listBooks({ limit: 100 }).catch(() => ({ items: [] })),
    listDevices({ limit: 100 }).catch(() => ({ items: [] })),
    listRooms().catch(() => ({ items: [] })),
  ]);

  const userById = new Map(users.items.map((u) => [u.id, u]));
  const resById = new Map();
  [...books.items, ...devices.items, ...rooms.items].forEach((r) => resById.set(r.id, r));

  return {
    users: users.items,
    userName: (id) => userById.get(id)?.name || 'Unknown member',
    // booking adapter exposes resourceId; fall back to the booking's own title
    resourceName: (booking) => resById.get(booking.resourceId)?.title || booking.title,
  };
}
