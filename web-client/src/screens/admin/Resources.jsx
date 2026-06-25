import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { usePaginated } from "../../hooks/usePaginated";
import { listBooks, deleteBook } from "../../api/catalogue";
import { Loading, ErrorState } from "../../components/States";
import Pagination from "../../components/Pagination";
import ResourceImage from "../../components/ResourceImage";

export default function Resources() {
  const { setAdminModal, setStaffModal, showToast, user } = useApp();
  const { data, loading, error, reload } = useFetch(
    () => listBooks({ limit: 100 }),
    [],
  );

  // All hooks must run on every render — declare them before any early return.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState(null); // { id, title }
  const [deleting, setDeleting] = useState(false);

  const books = data?.items || [];
  const paged = usePaginated(books, page, pageSize);

  if (loading) return <Loading label="Loading resources…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const role = (user?.role || "").toLowerCase();
  const canDelete =
    role === "admin" ||
    role === "head_librarian" ||
    role === "library_staff" ||
    role === "staff";

  const stats = [
    { value: books.length, label: "Book titles", col: "#16a34a" },
    {
      value: books.reduce((s, b) => s + (b.available || 0), 0),
      label: "Available copies",
      col: "#3b82f6",
    },
    {
      value: books.filter((b) => (b.available || 0) === 0).length,
      label: "Fully on loan",
      col: "#f59e0b",
    },
    {
      value: new Set(books.map((b) => b.cat)).size,
      label: "Categories",
      col: "#7c3aed",
    },
  ];

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await deleteBook(confirm.id);
      showToast(`Deleted “${confirm.title}”`);
      setConfirm(null);
      reload();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not delete resource");
    } finally {
      setDeleting(false);
    }
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
            Click any title to manage its individual copies.
          </p>
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
          marginBottom: 24,
        }}>
        {stats.map((stat, i) => (
          <div
            className="pg-card-stat"
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
        className="pg-card"
        style={{
          background: "#fff",
          border: "1px solid #e7e7ef",
          borderRadius: 14,
          overflow: "hidden",
        }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr 1fr 260px",
            padding: "10px 20px",
            background: "#f8f8fc",
            borderBottom: "1px solid #e7e7ef",
          }}>
          {["Title", "Category", "Availability", "Actions"].map((col, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9b9db2",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
              {col}
            </span>
          ))}
        </div>

        {paged.slice.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#9b9db2",
              fontSize: 13,
            }}>
            No resources to show.
          </div>
        )}

        {paged.slice.map((book, i) => {
          const hasAvailable = (book.available || 0) > 0;
          return (
            <div
              key={book.id}
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr 1fr 260px",
                padding: "16px 20px",
                borderBottom:
                  i < paged.slice.length - 1 ? "1px solid #f0f0f6" : "none",
                alignItems: "center",
                gap: 12,
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <ResourceImage
                  imageUrl={book.imageUrl}
                  resourceType="BOOK"
                  color={book.color}
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
                    {book.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#9b9db2" }}>
                    {book.author}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#3a3b4e" }}>{book.cat}</span>
              <div>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: hasAvailable ? "#16a34a" : "#ef4444",
                  }}>
                  {book.available} available
                </span>
              </div>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() =>
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
                      copiesBook: book,
                    })
                  }
                  style={{
                    background: "#f0f0f6",
                    color: "#3a3b4e",
                    border: "1px solid #e7e7ef",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}>
                  Manage copies
                </button>
                {canDelete && (
                  <button
                    onClick={() =>
                      setConfirm({ id: book.id, title: book.title })
                    }
                    title="Delete resource"
                    aria-label={`Delete ${book.title}`}
                    style={{
                      background: "#fff",
                      color: "#ef4444",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <Pagination
          page={paged.page}
          pageSize={pageSize}
          total={paged.total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>

      {confirm && (
        <div
          onClick={() => !deleting && setConfirm(null)}
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
              width: 400,
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
              Delete this resource?
            </h3>
            <p style={{ fontSize: 13, color: "#7c7e93", margin: "0 0 18px" }}>
              “{confirm.title}” and all of its copies will be permanently
              removed. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirm(null)}
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
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  background: deleting ? "#fca5a5" : "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  padding: "11px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: deleting ? "default" : "pointer",
                }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
