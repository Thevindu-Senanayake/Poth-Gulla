import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { listBooks } from "../../api/catalogue";
import { BOOK_ICON } from "../../api/adapters";
import { Loading, ErrorState } from "../../components/States";

export default function Resources() {
  const { setAdminModal, setStaffModal } = useApp();
  const { data, loading, error, reload } = useFetch(
    () => listBooks({ limit: 100 }),
    [],
  );

  if (loading) return <Loading label="Loading resources…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const books = data?.items || [];
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
          background: "#fff",
          border: "1px solid #e7e7ef",
          borderRadius: 14,
          overflow: "hidden",
        }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr 1fr 140px",
            padding: "10px 20px",
            background: "#f8f8fc",
            borderBottom: "1px solid #e7e7ef",
          }}>
          {["Title", "Category", "Availability", ""].map((col, i) => (
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

        {books.map((book, i) => {
          const hasAvailable = (book.available || 0) > 0;
          return (
            <div
              key={book.id}
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr 1fr 140px",
                padding: "16px 20px",
                borderBottom:
                  i < books.length - 1 ? "1px solid #f0f0f6" : "none",
                alignItems: "center",
                gap: 12,
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 54,
                    background: book.color,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    {BOOK_ICON.split("M")
                      .filter(Boolean)
                      .map((d, j) => (
                        <path key={j} d={"M" + d} />
                      ))}
                  </svg>
                </div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
