import { api } from './client';
import { adaptWaitlistEntry } from './adapters';

// GET /waitlist/me — own pending waitlist entries
export async function myWaitlist() {
  const { data } = await api.get('/waitlist/me');
  return (data ?? []).map(adaptWaitlistEntry);
}

// GET /waitlist/:resourceType/:resourceKey — full ordered queue (ADMIN, LIBRARY_STAFF)
export async function queue(resourceType, resourceKey) {
  const { data } = await api.get(`/waitlist/${resourceType}/${resourceKey}`);
  return (data ?? []).map(adaptWaitlistEntry);
}

export const promote = (id, staffNotes) =>
  api.post(`/waitlist/${id}/promote`, { staffNotes }).then((r) => r.data);
export const dismiss = (id, staffNotes) =>
  api.post(`/waitlist/${id}/dismiss`, { staffNotes }).then((r) => r.data);
