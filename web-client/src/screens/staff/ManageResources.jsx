import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import {
  listBooks,
  listDevices,
  listRooms,
  getBook,
  addCopy,
  retireCopy,
  restoreCopy,
  setDeviceMaintenance,
  setRoomMaintenance,
  deleteBook,
  deleteDevice,
  deleteRoom,
} from "../../api/catalogue";
import { allBookings } from "../../api/bookings";
import { listUsers } from "../../api/users";
import { scanReturn } from "../../api/misc";
import { Loading, ErrorState, Empty } from "../../components/States";
import Pagination from "../../components/Pagination";
import { usePaginated } from "../../hooks/usePaginated";
import ResourceImage from "../../components/ResourceImage";

// Surfaces the raw backend error so QA/back-end can reproduce; falls back to
// a friendly message if the server didn't supply one.
function backendError(e, fallback) {
  const data = e?.response?.data;
  const status = e?.response?.status;
  const msg =
    (typeof data === "string" && data) ||
    data?.message ||
    data?.error ||
    e?.message ||
    fallback;
  return status ? `${msg} (HTTP ${status})` : msg;
}

function SvgIcon({ path, color, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path
        .split("M")
        .filter(Boolean)
        .map((d, i) => (
          <path key={i} d={"M" + d} />
        ))}
    </svg>
  );
}

/* ── Confirmation dialog ── */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,24,15,0.48)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "pg-pop .15s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 22px",
          width: 400,
          maxWidth: "92vw",
          boxShadow: "0 20px 50px rgba(6,24,15,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${confirmColor}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SvgIcon
              path="M12 9v4M12 17h.01M12 3l9.5 16.5H2.5z"
              color={confirmColor}
              size={18}
            />
          </div>
          <h3
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 17,
              fontWeight: 700,
              color: "#1a1b2e",
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#5a5c74",
            lineHeight: 1.65,
            margin: "0 0 20px",
            paddingLeft: 46,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "1.5px solid #e7e7ef",
              background: "#fff",
              color: "#3a3b4e",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "none",
              background: confirmColor,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 2px 10px ${confirmColor}40`,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Per-copy / per-item status presentation.
const STATUS_META = {
  AVAILABLE: { label: "Available", col: "#16a34a", bg: "#dcfce7" },
  BORROWED: { label: "On loan", col: "#2563eb", bg: "#dbeafe" },
  UNDER_MAINTENANCE: { label: "Maintenance", col: "#d97706", bg: "#fef2e2" },
  RETIRED: { label: "Lost / retired", col: "#ef4444", bg: "#fee2e2" },
};
function badge(status) {
  const m = STATUS_META[status] || {
    label: status,
    col: "#7c7e93",
    bg: "#f3f3f8",
  };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: m.col,
        background: m.bg,
        borderRadius: 20,
        padding: "3px 10px",
      }}
    >
      {m.label}
    </span>
  );
}

const TABS = [
  { key: "books", label: "Books" },
  { key: "devices", label: "Devices" },
  { key: "rooms", label: "Study Rooms" },
  { key: "loans", label: "Loaned devices" },
];

async function loadAll() {
  const [books, devices, rooms, completed, users] = await Promise.all([
    listBooks({ limit: 100 }),
    listDevices({ limit: 100 }),
    listRooms(),
    allBookings({ status: "COMPLETED", resourceType: "DEVICE", limit: 100 }),
    listUsers({ limit: 100 }).catch(() => ({ items: [] })),
  ]);
  return {
    books: books.items,
    devices: devices.items,
    rooms: rooms.items,
    deviceBookings: completed.items,
    users: users.items,
  };
}

/* ── Row hover style helper ── */
const rowHoverStyle = {
  transition: "background 0.15s ease, box-shadow 0.15s ease",
  cursor: "default",
};

export default function ManageResources() {
  const { setStaffModal, showToast, refresh, searchQuery } = useApp();
  const [pages, setPages] = useState({ books: 1, devices: 1, rooms: 1 });
  const [pageSize, setPageSize] = useState(30);
  const setTabPage = (k, n) => setPages((p) => ({ ...p, [k]: n }));
  const { data, loading, error, reload } = useFetch(() => loadAll(), []);

  const [tab, setTab] = useState("books");
  const [openBook, setOpenBook] = useState(null);
  const [copies, setCopies] = useState({});
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [working, setWorking] = useState(false);
  const [cond, setCond] = useState({});

  // Confirmation dialog state
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmColor: "#16a34a",
    onConfirm: () => {},
  });

  function askConfirm({
    title,
    message,
    confirmLabel,
    confirmColor,
    onConfirm,
  }) {
    setConfirm({
      open: true,
      title,
      message,
      confirmLabel: confirmLabel || "Confirm",
      confirmColor: confirmColor || "#16a34a",
      onConfirm: () => {
        setConfirm((c) => ({ ...c, open: false }));
        onConfirm();
      },
    });
  }
  function closeConfirm() {
    setConfirm((c) => ({ ...c, open: false }));
  }

  // ---- Delete helpers (used by all three tabs) ----
  async function doDeleteBook(book) {
    try {
      const fresh = await getBook(book.id);
      const copies = fresh.raw?.copies || [];
      const live = copies.filter((c) => c.status !== "RETIRED");
      const onLoan = live.filter((c) => c.status === "BORROWED");
      if (onLoan.length > 0) {
        showToast(
          `Cannot delete — ${onLoan.length} copy${onLoan.length > 1 ? "ies are" : " is"} currently on loan.`,
        );
        return;
      }
      for (const c of live) {
        try {
          await retireCopy(c.id);
        } catch (re) {
          showToast(backendError(re, `Could not retire copy ${c.assetTag}`));
          return;
        }
      }
      await deleteBook(book.id);
      showToast(`Deleted "${book.title}"`);
      refresh();
      reload();
    } catch (e) {
      showToast(backendError(e, "Could not delete book"));
    }
  }
  async function doDeleteDevice(device) {
    try {
      await deleteDevice(device.id);
      showToast(`Deleted "${device.title}"`);
      refresh();
      reload();
    } catch (e) {
      showToast(backendError(e, "Could not delete device"));
    }
  }
  async function doDeleteRoom(room) {
    try {
      await deleteRoom(room.id);
      showToast(`Deleted "${room.title}"`);
      refresh();
      reload();
    } catch (e) {
      showToast(backendError(e, "Could not delete room"));
    }
  }

  // Derive filtered arrays first so hooks below run unconditionally.
  const allBooks = data?.books || [];
  const allDevices = data?.devices || [];
  const allRooms = data?.rooms || [];

  const q = (searchQuery || "").trim().toLowerCase();
  const matches = (r) =>
    !q ||
    (r.title || "").toLowerCase().includes(q) ||
    (r.author || "").toLowerCase().includes(q) ||
    (r.cat || "").toLowerCase().includes(q) ||
    (r.serial || "").toLowerCase().includes(q);
  const books = q ? allBooks.filter(matches) : allBooks;
  const devices = q ? allDevices.filter(matches) : allDevices;
  const rooms = q ? allRooms.filter(matches) : allRooms;

  const bookPage = usePaginated(books, pages.books, pageSize);
  const devicePage = usePaginated(devices, pages.devices, pageSize);
  const roomPage = usePaginated(rooms, pages.rooms, pageSize);

  if (loading) return <Loading label="Loading resources…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // ---- Derive active device loans ----
  const userName = new Map((data?.users || []).map((u) => [u.id, u.name]));
  const latestBookingFor = new Map();
  (data?.deviceBookings || []).forEach((b) => {
    const did = b.resourceId;
    const prev = latestBookingFor.get(did);
    const t = new Date(b.raw?.createdAt || b.startAt).getTime();
    if (!prev || t > prev._t) latestBookingFor.set(did, { ...b, _t: t });
  });
  const now = Date.now();
  const loans = devices
    .filter((d) => d.raw?.status === "BORROWED")
    .map((d) => {
      const b = latestBookingFor.get(d.id);
      const due = b?.endAt ? new Date(b.endAt) : null;
      return {
        device: d,
        borrower: b
          ? userName.get(b.userId) || "Unknown member"
          : "Unknown member",
        due,
        overdue: due ? due.getTime() < now : false,
      };
    });

  async function doReturn(device) {
    setWorking(true);
    try {
      await scanReturn(device.serial, cond[device.id] || "GOOD");
      showToast(`Return processed · ${device.title}`);
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not process return");
    } finally {
      setWorking(false);
    }
  }

  async function toggleCopies(book) {
    if (openBook === book.id) {
      setOpenBook(null);
      return;
    }
    setOpenBook(book.id);
    setNewTag("");
    if (!copies[book.id]) {
      setCopiesLoading(true);
      try {
        const full = await getBook(book.id);
        setCopies((c) => ({ ...c, [book.id]: full.raw?.copies || [] }));
      } catch (e) {
        showToast(e?.response?.data?.message ?? "Could not load copies");
      } finally {
        setCopiesLoading(false);
      }
    }
  }

  async function doAddCopy(bookId) {
    if (!newTag.trim()) {
      showToast("Enter an asset tag");
      return;
    }
    setWorking(true);
    try {
      const c = await addCopy(bookId, newTag.trim());
      setCopies((prev) => ({
        ...prev,
        [bookId]: [...(prev[bookId] || []), c],
      }));
      setNewTag("");
      showToast("Copy added");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not add copy");
    } finally {
      setWorking(false);
    }
  }

  async function doRetire(bookId, copy) {
    setWorking(true);
    try {
      await retireCopy(copy.id);
      setCopies((prev) => ({
        ...prev,
        [bookId]: prev[bookId].map((c) =>
          c.id === copy.id ? { ...c, status: "RETIRED" } : c,
        ),
      }));
      showToast("Copy marked lost / retired");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not retire copy");
    } finally {
      setWorking(false);
    }
  }

  async function doRestore(bookId, copy) {
    setWorking(true);
    try {
      await restoreCopy(copy.id);
      setCopies((prev) => ({
        ...prev,
        [bookId]: prev[bookId].map((c) =>
          c.id === copy.id ? { ...c, status: "AVAILABLE" } : c,
        ),
      }));
      showToast("Copy restored - marked available");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not restore copy");
    } finally {
      setWorking(false);
    }
  }

  async function toggleMaintenance(kind, item) {
    const under = item.raw?.status !== "UNDER_MAINTENANCE";
    setWorking(true);
    try {
      if (kind === "device") await setDeviceMaintenance(item.id, under);
      else await setRoomMaintenance(item.id, under);
      showToast(under ? "Marked under maintenance" : "Marked available");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Update failed");
    } finally {
      setWorking(false);
    }
  }

  const counts = [
    {
      value: books.length,
      label: "Book titles",
      col: "#16a34a",
      bg: "#dcfce7",
    },
    { value: devices.length, label: "Devices", col: "#3b82f6", bg: "#dbeafe" },
    {
      value: rooms.length,
      label: "Study rooms",
      col: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      value: loans.length,
      label: "Devices on loan",
      col: "#2563eb",
      bg: "#dbeafe",
    },
    {
      value: [...devices, ...rooms].filter(
        (r) => r.raw?.status === "UNDER_MAINTENANCE",
      ).length,
      label: "Under maintenance",
      col: "#f59e0b",
      bg: "#fef2e2",
    },
  ];

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}
    >
      {/* Confirmation modal */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmColor={confirm.confirmColor}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 22,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: "#7c7e93", margin: "0 0 3px" }}>
            Staff · Resources
          </p>
          <h1
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 26,
              fontWeight: 600,
              color: "#1a1b2e",
              margin: 0,
            }}
          >
            Manage resources
          </h1>
        </div>
        <button
          onClick={() =>
            setStaffModal({
              open: true,
              type: "book",
              rf: {
                rtitle: "",
                rauthor: "",
                rcat: "",
                rcopies: 1,
                rtier: 1,
                rstatus: "available",
              },
            })
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 3px 12px rgba(22,163,74,.28)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 5px 18px rgba(22,163,74,.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 3px 12px rgba(22,163,74,.28)";
          }}
        >
          <SvgIcon path="M12 5v14M5 12h14" color="#fff" size={15} />
          Add resource
        </button>
      </div>

      {/* Summary chips */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        {counts.map((s, i) => (
          <div
            key={i}
            style={{
              background: s.bg,
              border: `1px solid ${s.col}40`,
              borderRadius: 20,
              padding: "7px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 16,
                fontWeight: 800,
                color: s.col,
              }}
            >
              {s.value}
            </span>
            <span style={{ fontSize: 12, color: s.col, fontWeight: 500 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 18,
          background: "#f3f3f8",
          padding: 4,
          borderRadius: 10,
          width: "fit-content",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              background: tab === t.key ? "#16a34a" : "transparent",
              color: tab === t.key ? "#fff" : "#7c7e93",
              boxShadow:
                tab === t.key ? "0 2px 8px rgba(22,163,74,.25)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- BOOKS: copy-level management ---- */}
      {tab === "books" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {books.length === 0 ? (
            <Empty
              label={q ? `No books match "${searchQuery}".` : "No books yet."}
            />
          ) : (
            bookPage.slice.map((book, i) => {
              const isOpen = openBook === book.id;
              const list = copies[book.id] || [];
              const liveAvail = list.length
                ? list.filter((c) => c.status === "AVAILABLE").length
                : book.available;
              return (
                <div
                  key={book.id}
                  style={{
                    borderBottom:
                      i < bookPage.slice.length - 1
                        ? "1px solid #f3f3f8"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 20px",
                      ...rowHoverStyle,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f8faf9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <ResourceImage
                      imageUrl={book.imageUrl}
                      resourceType="BOOK"
                      iconPath={book.iconPath}
                      color={book.color}
                      w={38}
                      h={46}
                      radius={5}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1a1b2e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {book.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#7c7e93" }}>
                        {book.author}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        color: liveAvail > 0 ? "#16a34a" : "#ef4444",
                        width: 110,
                        textAlign: "right",
                      }}
                    >
                      {liveAvail} available
                    </div>
                    <button
                      onClick={() => toggleCopies(book)}
                      style={{
                        background: isOpen ? "#16a34a" : "#f0f0f6",
                        color: isOpen ? "#fff" : "#3a3b4e",
                        border: "1px solid #e7e7ef",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isOpen) {
                          e.currentTarget.style.background = "#e8e8f0";
                          e.currentTarget.style.borderColor = "#d0d0de";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOpen) {
                          e.currentTarget.style.background = "#f0f0f6";
                          e.currentTarget.style.borderColor = "#e7e7ef";
                        }
                      }}
                    >
                      {isOpen ? "Hide copies" : "Manage copies"}
                    </button>
                    <button
                      onClick={() =>
                        askConfirm({
                          title: "Delete this book?",
                          message: `"${book.title}" and all of its copies will be permanently removed. Any non-retired copies will be retired first. This cannot be undone.`,
                          confirmLabel: "Delete",
                          confirmColor: "#ef4444",
                          onConfirm: () => doDeleteBook(book),
                        })
                      }
                      style={{
                        background: "#fff",
                        color: "#ef4444",
                        border: "1px solid #fecaca",
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        marginLeft: 6,
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Copies panel */}
                  {isOpen && (
                    <div
                      style={{
                        padding: "4px 20px 18px 72px",
                        background: "#fafafb",
                      }}
                    >
                      {copiesLoading && !copies[book.id] ? (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9b9db2",
                            padding: "10px 0",
                          }}
                        >
                          Loading copies…
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              margin: "12px 0",
                            }}
                          >
                            <input
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="New copy asset tag e.g. BK-CC-004"
                              style={{
                                flex: 1,
                                maxWidth: 320,
                                border: "1.5px solid #e7e7ef",
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 13,
                                fontFamily: "'IBM Plex Mono', monospace",
                                outline: "none",
                                background: "#fff",
                                transition: "border-color 0.15s ease",
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#16a34a";
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#e7e7ef";
                              }}
                            />
                            <button
                              onClick={() => doAddCopy(book.id)}
                              disabled={working}
                              style={{
                                background: "#16a34a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "0 16px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#15803d";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#16a34a";
                              }}
                            >
                              Add copy
                            </button>
                          </div>
                          {list.length === 0 ? (
                            <div
                              style={{
                                fontSize: 13,
                                color: "#9b9db2",
                                padding: "6px 0",
                              }}
                            >
                              No copies registered yet.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {list.map((copy) => (
                                <div
                                  key={copy.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "9px 14px",
                                    borderRadius: 9,
                                    border: "1px solid #e7e7ef",
                                    background: "#fff",
                                    transition:
                                      "box-shadow 0.15s ease, border-color 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow =
                                      "0 2px 8px rgba(0,0,0,0.06)";
                                    e.currentTarget.style.borderColor =
                                      "#d0d0de";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor =
                                      "#e7e7ef";
                                  }}
                                >
                                  <div
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: 13,
                                      color: "#16231b",
                                    }}
                                  >
                                    {copy.assetTag}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                    }}
                                  >
                                    {badge(copy.status)}
                                    {copy.status === "RETIRED" && (
                                      <button
                                        onClick={() =>
                                          askConfirm({
                                            title: "Mark copy as found?",
                                            message: `Restore copy "${copy.assetTag}" to available status? This will make it borrowable again.`,
                                            confirmLabel: "Mark found",
                                            confirmColor: "#16a34a",
                                            onConfirm: () =>
                                              doRestore(book.id, copy),
                                          })
                                        }
                                        disabled={working}
                                        style={{
                                          background: "#fff",
                                          border: "1px solid #bbf7d0",
                                          color: "#16a34a",
                                          borderRadius: 7,
                                          padding: "4px 10px",
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          transition: "all 0.15s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background =
                                            "#f0fdf4";
                                          e.currentTarget.style.borderColor =
                                            "#86efac";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background =
                                            "#fff";
                                          e.currentTarget.style.borderColor =
                                            "#bbf7d0";
                                        }}
                                      >
                                        Mark found
                                      </button>
                                    )}
                                    {copy.status !== "RETIRED" &&
                                      copy.status !== "BORROWED" && (
                                        <button
                                          onClick={() =>
                                            askConfirm({
                                              title: "Mark copy as lost?",
                                              message: `Are you sure you want to mark "${copy.assetTag}" as lost/retired? You can restore it later if found.`,
                                              confirmLabel: "Mark lost",
                                              confirmColor: "#dc2626",
                                              onConfirm: () =>
                                                doRetire(book.id, copy),
                                            })
                                          }
                                          disabled={working}
                                          style={{
                                            background: "#fff",
                                            border: "1px solid #fecaca",
                                            color: "#dc2626",
                                            borderRadius: 7,
                                            padding: "4px 10px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background =
                                              "#fef2f2";
                                            e.currentTarget.style.borderColor =
                                              "#fca5a5";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                              "#fff";
                                            e.currentTarget.style.borderColor =
                                              "#fecaca";
                                          }}
                                        >
                                          Mark lost
                                        </button>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9b9db2",
                              marginTop: 10,
                            }}
                          >
                            Borrowed copies can't be retired until they're
                            returned. Lost copies can be marked found to restore
                            availability.
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <Pagination
            page={bookPage.page}
            pageSize={pageSize}
            total={bookPage.total}
            onPageChange={(n) => setTabPage("books", n)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPages({ books: 1, devices: 1, rooms: 1 });
            }}
            pageSizes={[10, 30, 50, 100]}
          />
        </div>
      )}

      {/* ---- DEVICES: maintenance ---- */}
      {tab === "devices" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.4fr 0.8fr 1fr 1.6fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}
          >
            {["Device", "Serial", "Tier", "Status", "Maintenance"].map(
              (h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7c7e93",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {devices.length === 0 ? (
            <Empty
              label={
                q ? `No devices match "${searchQuery}".` : "No devices yet."
              }
            />
          ) : (
            devicePage.slice.map((d, i) => {
              const status = d.raw?.status || "AVAILABLE";
              const borrowed = status === "BORROWED";
              const under = status === "UNDER_MAINTENANCE";
              return (
                <div
                  key={d.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.4fr 0.8fr 1fr 1.6fr",
                    padding: "13px 20px",
                    borderBottom:
                      i < devicePage.slice.length - 1
                        ? "1px solid #f3f3f8"
                        : "none",
                    alignItems: "center",
                    ...rowHoverStyle,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8faf9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1a1b2e",
                    }}
                  >
                    <ResourceImage
                      imageUrl={d.imageUrl}
                      resourceType="DEVICE"
                      iconPath={d.iconPath}
                      color={d.color}
                      w={40}
                      h={40}
                      radius={6}
                    />
                    <span>{d.title}</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: "#5a5c74",
                    }}
                  >
                    {d.serial}
                  </div>
                  <div style={{ fontSize: 12, color: "#3a3b4e" }}>
                    T{d.tier}
                  </div>
                  <div>{badge(status)}</div>
                  <div>
                    <button
                      onClick={() =>
                        askConfirm({
                          title: under
                            ? "Set device available?"
                            : "Set device to maintenance?",
                          message: under
                            ? `Mark "${d.title}" as available again? Members will be able to borrow it.`
                            : `Mark "${d.title}" as under maintenance? It won't be available for borrowing.`,
                          confirmLabel: under
                            ? "Set available"
                            : "Set maintenance",
                          confirmColor: under ? "#16a34a" : "#d97706",
                          onConfirm: () => toggleMaintenance("device", d),
                        })
                      }
                      disabled={borrowed || working}
                      title={
                        borrowed
                          ? "Borrowed devices cannot be set to maintenance"
                          : ""
                      }
                      style={{
                        background: under ? "#16a34a" : "#fff",
                        color: under
                          ? "#fff"
                          : borrowed
                            ? "#c5c7d4"
                            : "#d97706",
                        border: `1px solid ${under ? "#16a34a" : "#e7e7ef"}`,
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: borrowed ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!borrowed) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 2px 8px rgba(0,0,0,0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {under ? "Set available" : "Set maintenance"}
                    </button>
                    <button
                      onClick={() =>
                        askConfirm({
                          title: "Delete this device?",
                          message: `"${d.title}" will be permanently removed. This cannot be undone.`,
                          confirmLabel: "Delete",
                          confirmColor: "#ef4444",
                          onConfirm: () => doDeleteDevice(d),
                        })
                      }
                      disabled={borrowed}
                      title={borrowed ? "Cannot delete a borrowed device" : ""}
                      style={{
                        background: "#fff",
                        color: borrowed ? "#c5c7d4" : "#ef4444",
                        border: `1px solid ${borrowed ? "#e7e7ef" : "#fecaca"}`,
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: borrowed ? "not-allowed" : "pointer",
                        marginLeft: 6,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <Pagination
            page={devicePage.page}
            pageSize={pageSize}
            total={devicePage.total}
            onPageChange={(n) => setTabPage("devices", n)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPages({ books: 1, devices: 1, rooms: 1 });
            }}
            pageSizes={[10, 30, 50, 100]}
          />
        </div>
      )}

      {/* ---- ROOMS: maintenance ---- */}
      {tab === "rooms" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1.6fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}
          >
            {["Room", "Capacity", "Status", "Maintenance"].map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c7e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {rooms.length === 0 ? (
            <Empty
              label={
                q ? `No rooms match "${searchQuery}".` : "No study rooms yet."
              }
            />
          ) : (
            roomPage.slice.map((r, i) => {
              const status = r.raw?.status || "AVAILABLE";
              const under = status === "UNDER_MAINTENANCE";
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1.6fr",
                    padding: "13px 20px",
                    borderBottom:
                      i < roomPage.slice.length - 1
                        ? "1px solid #f3f3f8"
                        : "none",
                    alignItems: "center",
                    ...rowHoverStyle,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8faf9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1a1b2e",
                    }}
                  >
                    <ResourceImage
                      imageUrl={r.imageUrl}
                      resourceType="ROOM"
                      iconPath={r.iconPath}
                      color={r.color}
                      w={40}
                      h={40}
                      radius={6}
                    />
                    <span>{r.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#3a3b4e" }}>
                    {r.capacity} seats
                  </div>
                  <div>{badge(status)}</div>
                  <div>
                    <button
                      onClick={() =>
                        askConfirm({
                          title: under
                            ? "Set room available?"
                            : "Set room to maintenance?",
                          message: under
                            ? `Mark "${r.title}" as available again? Members will be able to reserve it.`
                            : `Mark "${r.title}" as under maintenance? It won't be available for reservation.`,
                          confirmLabel: under
                            ? "Set available"
                            : "Set maintenance",
                          confirmColor: under ? "#16a34a" : "#d97706",
                          onConfirm: () => toggleMaintenance("room", r),
                        })
                      }
                      disabled={working}
                      style={{
                        background: under ? "#16a34a" : "#fff",
                        color: under ? "#fff" : "#d97706",
                        border: `1px solid ${under ? "#16a34a" : "#e7e7ef"}`,
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {under ? "Set available" : "Set maintenance"}
                    </button>
                    <button
                      onClick={() =>
                        askConfirm({
                          title: "Delete this study room?",
                          message: `"${r.title}" will be permanently removed. This cannot be undone.`,
                          confirmLabel: "Delete",
                          confirmColor: "#ef4444",
                          onConfirm: () => doDeleteRoom(r),
                        })
                      }
                      style={{
                        background: "#fff",
                        color: "#ef4444",
                        border: "1px solid #fecaca",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        marginLeft: 6,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <Pagination
            page={roomPage.page}
            pageSize={pageSize}
            total={roomPage.total}
            onPageChange={(n) => setTabPage("rooms", n)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPages({ books: 1, devices: 1, rooms: 1 });
            }}
            pageSizes={[10, 30, 50, 100]}
          />
        </div>
      )}

      {/* ---- LOANED DEVICES: who has what, return management ---- */}
      {tab === "loans" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.3fr 1.4fr 1fr 1.6fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}
          >
            {["Device", "Serial", "Borrowed by", "Due", "Manage"].map(
              (h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7c7e93",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {h}
                </div>
              ),
            )}
          </div>
          {loans.length === 0 ? (
            <Empty label="No devices are currently on loan." />
          ) : (
            loans.map((ln, i) => (
              <div
                key={ln.device.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1.3fr 1.4fr 1fr 1.6fr",
                  padding: "13px 20px",
                  borderBottom:
                    i < loans.length - 1 ? "1px solid #f3f3f8" : "none",
                  alignItems: "center",
                  ...rowHoverStyle,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8faf9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: "#1a1b2e" }}
                >
                  {ln.device.title}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "#5a5c74",
                  }}
                >
                  {ln.device.serial}
                </div>
                <div style={{ fontSize: 13, color: "#3a3b4e" }}>
                  {ln.borrower}
                </div>
                <div>
                  {ln.due ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 20,
                        padding: "3px 10px",
                        color: ln.overdue ? "#ef4444" : "#2563eb",
                        background: ln.overdue ? "#fee2e2" : "#dbeafe",
                      }}
                    >
                      {ln.overdue ? "Overdue · " : ""}
                      {ln.due.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#9b9db2" }}>-</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={cond[ln.device.id] || "GOOD"}
                    onChange={(e) =>
                      setCond((c) => ({ ...c, [ln.device.id]: e.target.value }))
                    }
                    style={{
                      border: "1.5px solid #e7e7ef",
                      borderRadius: 8,
                      padding: "6px 8px",
                      fontSize: 12,
                      color: "#1a1b2e",
                      background: "#fff",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                  <button
                    onClick={() =>
                      askConfirm({
                        title: "Process return?",
                        message: `Return "${ln.device.title}" from ${ln.borrower}? Condition: ${cond[ln.device.id] || "GOOD"}. Points will be scored automatically.`,
                        confirmLabel: "Process return",
                        confirmColor: "#16a34a",
                        onConfirm: () => doReturn(ln.device),
                      })
                    }
                    disabled={working}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#15803d";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#16a34a";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    Process return
                  </button>
                </div>
              </div>
            ))
          )}
          <div
            style={{
              fontSize: 11,
              color: "#9b9db2",
              padding: "12px 20px",
              borderTop: "1px solid #f3f3f8",
            }}
          >
            Returning frees the device, applies point scoring (late/damage), and
            auto-promotes the next waitlist entry.
          </div>
        </div>
      )}
    </div>
  );
}
