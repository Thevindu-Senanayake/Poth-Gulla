import { api } from './client';
import { adaptBook, adaptDevice, adaptRoom } from './adapters';

// ---- Categories ----
export async function listCategories(type) {
  const { data } = await api.get('/catalogue/categories', { params: type ? { type } : {} });
  return data;
}

// ---- Books ----
export async function listBooks(params = {}) {
  const { data } = await api.get('/catalogue/books', { params });
  return { items: (data.data ?? []).map(adaptBook), total: data.total ?? 0, raw: data.data ?? [] };
}
export async function getBook(id) {
  const { data } = await api.get(`/catalogue/books/${id}`);
  return adaptBook(data);
}
export const createBook = (body) => api.post('/catalogue/books', body).then((r) => r.data);
export const updateBook = (id, body) => api.patch(`/catalogue/books/${id}`, body).then((r) => r.data);
export const deleteBook = (id) => api.delete(`/catalogue/books/${id}`).then((r) => r.data);
export const addCopy = (id, assetTag) => api.post(`/catalogue/books/${id}/copies`, { assetTag }).then((r) => r.data);
export const retireCopy = (copyId) => api.delete(`/catalogue/copies/${copyId}`).then((r) => r.data);

// ---- Devices ----
export async function listDevices(params = {}) {
  const { data } = await api.get('/catalogue/devices', { params });
  return { items: (data.data ?? []).map(adaptDevice), total: data.total ?? 0, raw: data.data ?? [] };
}
export const getDevice = (id) => api.get(`/catalogue/devices/${id}`).then((r) => adaptDevice(r.data));
export const createDevice = (body) => api.post('/catalogue/devices', body).then((r) => r.data);
export const updateDevice = (id, body) => api.patch(`/catalogue/devices/${id}`, body).then((r) => r.data);
export const deleteDevice = (id) => api.delete(`/catalogue/devices/${id}`).then((r) => r.data);
export const setDeviceMaintenance = (id, underMaintenance) =>
  api.patch(`/catalogue/devices/${id}/maintenance`, { underMaintenance }).then((r) => r.data);

// ---- Rooms ----
export async function listRooms(startAt, endAt) {
  const params = {};
  if (startAt) params.startAt = startAt;
  if (endAt) params.endAt = endAt;
  const { data } = await api.get('/catalogue/rooms', { params });
  return { items: (data ?? []).map(adaptRoom), raw: data ?? [] };
}
export const getRoom = (id) => api.get(`/catalogue/rooms/${id}`).then((r) => adaptRoom(r.data));
export const createRoom = (body) => api.post('/catalogue/rooms', body).then((r) => r.data);
export const updateRoom = (id, body) => api.patch(`/catalogue/rooms/${id}`, body).then((r) => r.data);
export const deleteRoom = (id) => api.delete(`/catalogue/rooms/${id}`).then((r) => r.data);
export const setRoomMaintenance = (id, underMaintenance) =>
  api.patch(`/catalogue/rooms/${id}/maintenance`, { underMaintenance }).then((r) => r.data);

// Convenience: the full catalogue (books + devices + rooms) for the student browse screen.
export async function listAllResources(search = '') {
  const [books, devices, rooms] = await Promise.all([
    listBooks({ search, limit: 100 }),
    listDevices({ search, limit: 100 }),
    listRooms(),
  ]);
  return [...books.items, ...devices.items, ...rooms.items];
}
