import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { usePaginated } from "../../hooks/usePaginated";
import {
  listBooks,
  listDevices,
  listRooms,
  deleteBook,
  deleteDevice,
  deleteRoom,
  getBook,
  retireCopy,
} from "../../api/catalogue";
import { Loading, ErrorState } from "../../components/States";
import Pagination from "../../components/Pagination";
import ResourceImage from "../../components/ResourceImage";

const TABS = [
  { key: "books", label: "Books" },
  { key: "devices", label: "Devices" },
  { key: "rooms", label: "Study Rooms" },
];

// Show the actual backend message + HTTP status so QA can match the failure
// to a server-side log line.
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

async function loadAll() {
  const [books, devices, rooms] = await Promise.all([
    listBooks({ limit: 500 }),
    listDevices({ limit: 500 }),
    listRooms(),
  ]);
  return {
    books: books.items,
    devices: devices.items,
    rooms: rooms.items,
  };
}

export default function Resources() {
  const { setAdminModal, setStaffModal, showToast, user, searchQuery } =
    useApp();
  const { data, loading, error, reload } = useFetch(() => loadAll(), []);

  const [tab, setTab] = useState("books");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const all =
    tab === "books"
      ? data?.books || []
      : tab === "devices"
        ? data?.devices || []
        : data?.rooms || [];

  const q = (searchQuery || "").trim().toLowerCase();
  const items = q
    ? all.filter(
        (r) =>
          (r.title || "").toLowerCase().includes(q) ||
          (r.author || "").toLowerCase().includes(q) ||
          (r.cat || "").toLowerCase().includes(q),
      )
    : all;

  const paged = usePaginated(items, page, pageSize);

  if (loading) return <Loading label="Loading resources…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const role = (user?.role || "").toLowerCase();
  const canDelete =
    role === "admin" ||
    role === "head_librarian" ||
    role === "staff" ||
    role === "library_staff";
  const canEdit = canDelete;

  const books = data?.books || [];
  const devices = data?.devices || [];
  const rooms = data?.rooms || [];

  const stats = [
    {
      value: books.length + devices.length + rooms.length,
      label: "Total resources",
      col: "#16a34a",
    },
    { value: books.length, label: "Book titles", col: "#3b82f6" },
    { value: devices.length, label: "Devices", col: "#7c3aed" },
    { value: rooms.length, label: "Study rooms", col: "#f59e0b" },
  ];

  function changeTab(next) {
    setTab(next);
    setPage(1);
  }

  function openEdit(item) {
    const type =
      tab === "devices" ? "device" : tab === "rooms" ? "room" : "book";
    setStaffModal({
      open: true,
      type,
      editItem: item,
      rf: {
        rtitle: item.title || "",
        rauthor: item.author || "",
        rcat: item.cat || "",
        rcopies: item.capacity || 1,
        rtier: item.tier || 1,
        rstatus: "available",
      },
    });
  }

  async function askDeleteBook(book) {
    try {
      const fresh = await getBook(book.id);
      const copies = fresh.raw?.copies || [];
      setConfirm({ kind: "book", id: book.id, title: book.title, copies });
    } catch {
      setConfirm({ kind: "book", id: book.id, title: book.title, copies: [] });
    }
  }

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === "book") {
        const live = (confirm.copies || []).filter(
          (c) => c.status !== "RETIRED",
        );
        const onLoan = live.filter((c) => c.status === "BORROWED");
        if (onLoan.length > 0) {
          showToast(
            `Cannot delete — ${onLoan.length} copy${onLoan.length > 1 ? "ies are" : " is"} currently on loan.`,
          );
          setDeleting(false);
          return;
        }
        for (const c of live) {
          try {
            await retireCopy(c.id);
          } catch (re) {
            showToast(backendError(re, `Could not retire copy ${c.assetTag}`));
            setDeleting(false);
            return;
          }
        }
        await deleteBook(confirm.id);
      } else if (confirm.kind === "device") {
        await deleteDevice(confirm.id);
      } else {
        await deleteRoom(confirm.id);
      }
      showToast(`Deleted "${confirm.title}"`);
      setConfirm(null);
      reload();
    } catch (e) {
      showToast(backendError(e, "Could not delete resource"));
    } finally {
      setDeleting(false);
    }
  }

  const rowGrid = "3fr 1fr 1fr 320px";

  function renderRow(item, i, last) {
    const isBook = tab === "books";
    const hasAvail = (item.available || 0) > 0;
    const availLabel = isBook
      ? `${item.available} available`
      : hasAvail
        ? "Available"
        : "Unavailable";

    const onManageCopies = () =>
      setAdminModal({
        open: true,
        mode: "copies",
        editUser: null,
        uf: {
          uname: "",
          uemail: "",
          ubatch: "",
          uphone: "",
          urole: "student",
        },
        copiesBook: item,
      });

    const askDelete = () => {
      if (isBook) askDeleteBook(item);
      else
        setConfirm({
          kind: tab === "devices" ? "device" : "room",
          id: item.id,
          title: item.title,
          copies: [],
        });
    };

    return (
      <div
        key={item.id}
        style={{
          display: "grid",
          gridTemplateColumns: rowGrid,
          padding: "16px 20px",
          borderBottom: i < last ? "1px solid #f0f0f6" : "none",
          alignItems: "center",
          gap: 12,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ResourceImage
            imageUrl={item.imageUrl}
            resourceType={(item.type || "").toUpperCase() || "BOOK"}
            iconPath={item.iconPath}
            color={item.color}
            w={44}
            h={54}
            radius={6}
          />
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#1a1b2e",
                marginBottom: 2,
              }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: "#9b9db2" }}>{item.author}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: "#3a3b4e" }}>{item.cat}</span>
        <div>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              color: hasAvail ? "#16a34a" : "#ef4444",
            }}>
            {availLabel}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {isBook && (
            <button
              onClick={onManageCopies}
              style={{
                background: "#f0f0f6",
                color: "#3a3b4e",
                border: "1px solid #e7e7ef",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
              Manage copies
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => openEdit(item)}
              style={{
                background: "#fff",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}>
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={askDelete}
              style={{
                background: "#fff",
                color: "#ef4444",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

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
          <h1
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#1a1b2e",
              margin: "0 0 4px",
            }}>
            Resources
          </h1>
          <p style={{ fontSize: 13, color: "#7c7e93", margin: 0 }}>
            Books, devices and study rooms — copy-level management.
            {q && (
              <span style={{ marginLeft: 8 }}>
                · {items.length} match "{searchQuery}"
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() =>
            setStaffModal({
              open: true,
              type:
                tab === "devices"
                  ? "device"
                  : tab === "rooms"
                    ? "room"
                    : "book",
              editItem: null,
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
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}>
          + Add resource
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 18,
        }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 13,
              padding: "18px 22px",
              borderTop: `4px solid ${stat.col}`,
            }}>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 28,
                fontWeight: 700,
                color: stat.col,
                marginBottom: 4,
              }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "#7c7e93", fontWeight: 600 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
          borderBottom: "1px solid #e7e7ef",
        }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: active ? "#16a34a" : "#7c7e93",
                cursor: "pointer",
                borderBottom: active
                  ? "2px solid #16a34a"
                  : "2px solid transparent",
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

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
            gridTemplateColumns: rowGrid,
            padding: "10px 20px",
            background: "#f8f8fc",
            borderBottom: "1px solid #e7e7ef",
          }}>
          {["Title", "Category", "Availability", "Actions"].map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9b9db2",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
              {c}
            </span>
          ))}
        </div>

        {paged.slice.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#9b9db2",
              fontSize: 13,
            }}>
            {q ? `No ${tab} match "${searchQuery}".` : `No ${tab} yet.`}
          </div>
        ) : (
          paged.slice.map((item, i) => renderRow(item, i, paged.slice.length))
        )}

        <Pagination
          page={paged.page}
          pageSize={pageSize}
          total={paged.total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          pageSizes={[10, 30, 50, 100]}
        />
      </div>

      {confirm && (
        <ConfirmDelete
          confirm={confirm}
          deleting={deleting}
          onCancel={() => !deleting && setConfirm(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function ConfirmDelete({ confirm, deleting, onCancel, onConfirm }) {
  const isBook = confirm.kind === "book";
  const liveCopies = (confirm.copies || []).filter(
    (c) => c.status !== "RETIRED",
  );
  const onLoan = liveCopies.filter((c) => c.status === "BORROWED");
  const willAutoRetire = liveCopies.length - onLoan.length;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,24,15,0.58)",
        backdropFilter: "blur(6px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: 440,
          maxWidth: "92vw",
          padding: 24,
          boxShadow: "0 24px 60px rgba(6,24,15,0.22)",
          fontFamily: "'Public Sans', sans-serif",
        }}>
        <h3
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 18,
            margin: "0 0 8px",
            color: "#1a1b2e",
          }}>
          Delete this {confirm.kind === "room" ? "study room" : confirm.kind}?
        </h3>
        <p style={{ fontSize: 13, color: "#7c7e93", margin: "0 0 14px" }}>
          "{confirm.title}" will be permanently removed. This cannot be undone.
        </p>

        {isBook && onLoan.length > 0 && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 9,
              padding: "10px 12px",
              fontSize: 12,
              marginBottom: 14,
            }}>
            {onLoan.length} copy{onLoan.length > 1 ? "ies are" : " is"}{" "}
            currently on loan — return them first.
          </div>
        )}
        {isBook && willAutoRetire > 0 && onLoan.length === 0 && (
          <div
            style={{
              background: "#fef9c3",
              border: "1px solid #fde68a",
              color: "#854d0e",
              borderRadius: 9,
              padding: "10px 12px",
              fontSize: 12,
              marginBottom: 14,
            }}>
            {willAutoRetire} non-retired cop
            {willAutoRetire > 1 ? "ies" : "y"} will be retired automatically.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1,
              background: "#f0f0f6",
              color: "#3a3b4e",
              border: "none",
              borderRadius: 9,
              padding: "11px",
              fontSize: 13,
              fontWeight: 700,
              cursor: deleting ? "default" : "pointer",
            }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting || (isBook && onLoan.length > 0)}
            style={{
              flex: 1,
              background:
                deleting || (isBook && onLoan.length > 0)
                  ? "#fca5a5"
                  : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "11px",
              fontSize: 13,
              fontWeight: 700,
              cursor:
                deleting || (isBook && onLoan.length > 0)
                  ? "default"
                  : "pointer",
            }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
