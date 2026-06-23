// Translates backend (Prisma) entities into the shapes the existing screens render.
// Keeping the UI field names stable means the screens barely change.

import { ROLE_MAP, ROLE_LABEL } from "./auth";

export const BOOK_ICON = "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z";
export const DEVICE_ICON =
  "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM2 18h20";
export const ROOM_ICON = "M3 3h18v18H3zM9 3v18M15 9H3M15 15H3";

const PALETTE = [
  "#15803d",
  "#7c3aed",
  "#0e7490",
  "#b45309",
  "#9f1239",
  "#1d4ed8",
  "#374151",
  "#db2777",
  "#0f766e",
];

// Deterministic colour from any string id so a resource keeps the same accent across renders.
export function colorFor(key = "") {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initialsFor(name = "") {
  return name
    .replace(/^(Dr|Prof)\.?\s*/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---- Catalogue ----

export function adaptBook(b) {
  const available =
    b._count?.copies ??
    b.copies?.filter?.((c) => c.status === "AVAILABLE").length ??
    0;
  const total = b.copies?.length ?? b._count?.copies ?? available;
  return {
    id: b.id,
    type: "book",
    title: b.title,
    author: b.author,
    cat: b.category?.name ?? "General",
    copies: total,
    available,
    color: colorFor(b.id),
    iconPath: BOOK_ICON,
    tags: b.tags ?? [],
    blurb: b.description ?? "",
    tier: null,
    raw: b,
  };
}

export function adaptDevice(d) {
  return {
    id: d.id,
    type: "device",
    title: d.name,
    author: `${d.category?.name ?? "Device"} · ${d.assetTag}`,
    cat: d.category?.name ?? "Device",
    copies: 1,
    available: d.status === "AVAILABLE" ? 1 : 0,
    color: colorFor(d.id),
    iconPath: DEVICE_ICON,
    tags: [d.category?.name].filter(Boolean),
    blurb:
      `Tier ${d.deviceTier} device. ${d.deviceTier >= 4 ? "Requires staff approval to check out." : ""}`.trim(),
    tier: d.deviceTier,
    status: d.status,
    serial: d.assetTag, // serial / asset tag — shown across the catalogue
    raw: d,
  };
}

export function adaptRoom(r) {
  return {
    id: r.id,
    type: "room",
    title: r.name,
    author: `Capacity: ${r.capacity}${r.features?.length ? " · " + r.features.join(", ") : ""}`,
    cat: "Study Room",
    copies: 1,
    available: (r.available ?? r.status === "AVAILABLE") ? 1 : 0,
    color: colorFor(r.id),
    iconPath: ROOM_ICON,
    tags: r.features ?? [],
    blurb: `Seats ${r.capacity}. Features: ${r.features?.join(", ") || "standard"}.`,
    tier: null,
    capacity: r.capacity,
    raw: r,
  };
}

// ---- Users ----

export function adaptUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: ROLE_LABEL[u.role] ?? u.role,
    roleKey: ROLE_MAP[u.role] ?? "student",
    rawRole: u.role,
    tier: u.tier ? `Tier ${u.tier}` : "—",
    tierNum: u.tier ?? 0,
    pts: u.userPoints ?? 0,
    status: u.isActive ? "Active" : "Suspended",
    isActive: u.isActive,
    color: colorFor(u.id),
    initials: initialsFor(u.name),
    group: ROLE_LABEL[u.role] ?? "",
    raw: u,
  };
}

// ---- Bookings ----

const STATUS_META = {
  APPROVED: { label: "Approved", col: "#059669", bg: "#d7f8e9" },
  PENDING: { label: "Pending approval", col: "#d97706", bg: "#fef2e2" },
  WAITLIST: { label: "Waitlisted", col: "#db2777", bg: "#fce7f3" },
  REJECTED: { label: "Rejected", col: "#ef4444", bg: "#fee2e2" },
  CANCELLED: { label: "Cancelled", col: "#6b7280", bg: "#f1f1f5" },
  COMPLETED: { label: "Completed", col: "#2563eb", bg: "#dbeafe" },
};

export function adaptBooking(b) {
  const meta = STATUS_META[b.status] ?? STATUS_META.PENDING;
  const resourceId = b.bookTitleId ?? b.deviceId ?? b.studyRoomId ?? "";
  return {
    id: b.id,
    resourceType: b.resourceType,
    type: (b.resourceType ?? "").toLowerCase(),
    resourceId,
    title:
      b.bookTitle?.title ??
      b.device?.name ??
      b.studyRoom?.name ??
      b.resourceType,
    userId: b.userId,
    userName: b.user?.name,
    status: b.status,
    statusLabel: meta.label,
    statusCol: meta.col,
    statusBg: meta.bg,
    startAt: b.startAt,
    endAt: b.endAt,
    message: b.message,
    qrToken: b.qrToken,
    color: colorFor(resourceId || b.id),
    raw: b,
  };
}

export function adaptWaitlistEntry(w) {
  return {
    id: w.id,
    bookingId: w.bookingId,
    resourceType: w.resourceType,
    resourceKey: w.resourceKey,
    priorityScore: w.priorityScore,
    hasMessage: w.hasMessage,
    status: w.status,
    title:
      w.booking?.bookTitle?.title ??
      w.booking?.device?.name ??
      w.booking?.studyRoom?.name ??
      w.resourceType,
    message: w.booking?.message ?? w.staffNotes ?? "",
    color: colorFor(w.resourceKey || w.id),
    raw: w,
  };
}
