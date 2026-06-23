import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { listAllResources } from "../../api/catalogue";
import { Loading, ErrorState } from "../../components/States";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "book", label: "Books" },
  { key: "device", label: "Devices" },
  { key: "room", label: "Study Rooms" },
];

export default function Catalogue() {
  const {
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSelectedResource,
    setPage,
  } = useApp();
  const { data, loading, error, reload } = useFetch(
    () => listAllResources(""),
    [],
  );

  if (loading) return <Loading label="Loading catalogue…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const resources = data || [];

  const filtered = resources.filter((r) => {
    const matchType = typeFilter === "all" || r.type === typeFilter;
    const q = (searchQuery || "").toLowerCase();
    const matchSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.author.toLowerCase().includes(q) ||
      r.cat.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  function handleCard(resource) {
    setSelectedResource(resource);
    setPage("resource");
  }

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 24,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: "0 0 4px",
          }}>
          Resource Catalogue
        </h1>
        <p style={{ color: "#7c7e93", fontSize: 13, margin: 0 }}>
          Browse books, devices, and study rooms available for borrowing
        </p>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: typeFilter === f.key ? "#16a34a" : "#e7e7ef",
              background: typeFilter === f.key ? "#16a34a" : "#fff",
              color: typeFilter === f.key ? "#fff" : "#7c7e93",
              fontSize: 13,
              fontWeight: typeFilter === f.key ? 700 : 400,
              cursor: "pointer",
              fontFamily: "'Public Sans', sans-serif",
              transition: "all 0.15s ease",
            }}>
            {f.label}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "#9b9db2",
            alignSelf: "center",
          }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Resource grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 16,
        }}>
        {filtered.map((resource) => {
          const isAvail = resource.available > 0;
          return (
            <div
              key={resource.id}
              onClick={() => handleCard(resource)}
              style={{
                background: "#fff",
                border: "1px solid #e7e7ef",
                borderRadius: 14,
                overflow: "hidden",
                cursor: "pointer",
                transition: "box-shadow 0.15s ease, transform 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.09)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}>
              {/* Card header */}
              <div
                style={{
                  background: resource.color,
                  height: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  {resource.iconPath
                    .split("M")
                    .filter(Boolean)
                    .map((d, j) => (
                      <path key={j} d={"M" + d} />
                    ))}
                </svg>
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 6,
                    padding: "3px 7px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}>
                  {resource.cat}
                </span>
                {resource.tier && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "rgba(245,158,11,0.9)",
                      color: "#1c1000",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 6,
                      padding: "3px 7px",
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}>
                    T{resource.tier}+
                  </span>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: "16px 18px 18px" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1b2e",
                    marginBottom: 3,
                    lineHeight: 1.3,
                  }}>
                  {resource.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7c7e93",
                    marginBottom: resource.serial ? 6 : 12,
                  }}>
                  {resource.author}
                </div>
                {resource.serial && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#5a5c74",
                      marginBottom: 12,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                    S/N: {resource.serial}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isAvail ? "#059669" : "#db2777",
                      background: isAvail ? "#d7f8e9" : "#fce7f3",
                      borderRadius: 6,
                      padding: "4px 9px",
                    }}>
                    {isAvail
                      ? `Available (${resource.available}/${resource.copies})`
                      : "Fully booked"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#16a34a",
                    }}>
                    {resource.type === "room"
                      ? "Reserve →"
                      : isAvail
                        ? "Book →"
                        : "Join waitlist →"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: "#9b9db2" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#7c7e93",
              marginBottom: 6,
            }}>
            No resources found
          </div>
          <div style={{ fontSize: 13 }}>
            Try adjusting your search or filter
          </div>
        </div>
      )}
    </div>
  );
}
