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
  setDeviceMaintenance,
  setRoomMaintenance,
} from "../../api/catalogue";
import { allBookings } from "../../api/bookings";
import { listUsers } from "../../api/users";
import { scanReturn } from "../../api/misc";
import { Loading, ErrorState, Empty } from "../../components/States";

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
      strokeLinejoin="round">
      {path
        .split("M")
        .filter(Boolean)
        .map((d, i) => (
          <path key={i} d={"M" + d} />
        ))}
    </svg>
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
      }}>
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
  // Borrowings have no list endpoint, so we reconstruct active device loans from:
  //  - devices currently BORROWED, + the latest COMPLETED device booking (borrower + due date),
  //  - the user list for names.
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

export default function ManageResources() {
  const { setStaffModal, showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => loadAll(), []);

  const [tab, setTab] = useState("books");
  const [openBook, setOpenBook] = useState(null); // bookId whose copies panel is open
  const [copies, setCopies] = useState({}); // { [bookId]: copy[] }
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [working, setWorking] = useState(false);
  const [cond, setCond] = useState({}); // { [deviceId]: 'GOOD' | 'DAMAGED' }

  if (loading) return <Loading label="Loading resources…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const books = data?.books || [];
  const devices = data?.devices || [];
  const rooms = data?.rooms || [];

  // ---- Derive active device loans ----
  const userName = new Map((data?.users || []).map((u) => [u.id, u.name]));
  const latestBookingFor = new Map(); // deviceId -> most recent COMPLETED booking
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
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 22,
        }}>
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
            }}>
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
          }}>
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
        }}>
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
            }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 16,
                fontWeight: 800,
                color: s.col,
              }}>
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
        }}>
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
            }}>
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
          }}>
          {books.length === 0 ? (
            <Empty label="No books yet." />
          ) : (
            books.map((book, i) => {
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
                      i < books.length - 1 ? "1px solid #f3f3f8" : "none",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 20px",
                    }}>
                    <div
                      style={{
                        width: 38,
                        height: 46,
                        background: book.color,
                        borderRadius: 5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                      <SvgIcon
                        path={book.iconPath}
                        color="rgba(255,255,255,0.9)"
                        size={16}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1a1b2e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
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
                      }}>
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
                      }}>
                      {isOpen ? "Hide copies" : "Manage copies"}
                    </button>
                  </div>

                  {/* Copies panel */}
                  {isOpen && (
                    <div
                      style={{
                        padding: "4px 20px 18px 72px",
                        background: "#fafafb",
                      }}>
                      {copiesLoading && !copies[book.id] ? (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9b9db2",
                            padding: "10px 0",
                          }}>
                          Loading copies…
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              margin: "12px 0",
                            }}>
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
                              }}>
                              Add copy
                            </button>
                          </div>
                          {list.length === 0 ? (
                            <div
                              style={{
                                fontSize: 13,
                                color: "#9b9db2",
                                padding: "6px 0",
                              }}>
                              No copies registered yet.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}>
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
                                  }}>
                                  <div
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: 13,
                                      color: "#16231b",
                                    }}>
                                    {copy.assetTag}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                    }}>
                                    {badge(copy.status)}
                                    {copy.status !== "RETIRED" &&
                                      copy.status !== "BORROWED" && (
                                        <button
                                          onClick={() =>
                                            doRetire(book.id, copy)
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
                                          }}>
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
                            }}>
                            Borrowed copies can't be retired until they're
                            returned.
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
          }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.4fr 0.8fr 1fr 1.2fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}>
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
                  }}>
                  {h}
                </div>
              ),
            )}
          </div>
          {devices.length === 0 ? (
            <Empty label="No devices yet." />
          ) : (
            devices.map((d, i) => {
              const status = d.raw?.status || "AVAILABLE";
              const borrowed = status === "BORROWED";
              const under = status === "UNDER_MAINTENANCE";
              return (
                <div
                  key={d.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.4fr 0.8fr 1fr 1.2fr",
                    padding: "13px 20px",
                    borderBottom:
                      i < devices.length - 1 ? "1px solid #f3f3f8" : "none",
                    alignItems: "center",
                  }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#1a1b2e" }}>
                    {d.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: "#5a5c74",
                    }}>
                    {d.serial}
                  </div>
                  <div style={{ fontSize: 12, color: "#3a3b4e" }}>
                    T{d.tier}
                  </div>
                  <div>{badge(status)}</div>
                  <div>
                    <button
                      onClick={() => toggleMaintenance("device", d)}
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
                      }}>
                      {under ? "Set available" : "Set maintenance"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
          }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1.2fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}>
            {["Room", "Capacity", "Status", "Maintenance"].map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c7e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}>
                {h}
              </div>
            ))}
          </div>
          {rooms.length === 0 ? (
            <Empty label="No study rooms yet." />
          ) : (
            rooms.map((r, i) => {
              const status = r.raw?.status || "AVAILABLE";
              const under = status === "UNDER_MAINTENANCE";
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1.2fr",
                    padding: "13px 20px",
                    borderBottom:
                      i < rooms.length - 1 ? "1px solid #f3f3f8" : "none",
                    alignItems: "center",
                  }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#1a1b2e" }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#3a3b4e" }}>
                    {r.capacity} seats
                  </div>
                  <div>{badge(status)}</div>
                  <div>
                    <button
                      onClick={() => toggleMaintenance("room", r)}
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
                      }}>
                      {under ? "Set available" : "Set maintenance"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
          }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.3fr 1.4fr 1fr 1.6fr",
              padding: "12px 20px",
              background: "#f8f8fc",
              borderBottom: "1px solid #e7e7ef",
            }}>
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
                  }}>
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
                }}>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: "#1a1b2e" }}>
                  {ln.device.title}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "#5a5c74",
                  }}>
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
                      }}>
                      {ln.overdue ? "Overdue · " : ""}
                      {ln.due.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#9b9db2" }}>—</span>
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
                    }}>
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                  <button
                    onClick={() => doReturn(ln.device)}
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
                    }}>
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
            }}>
            Returning frees the device, applies point scoring (late/damage), and
            auto-promotes the next waitlist entry.
          </div>
        </div>
      )}
    </div>
  );
}
