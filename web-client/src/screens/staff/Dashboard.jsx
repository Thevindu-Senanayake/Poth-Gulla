import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { allBookings } from "../../api/bookings";
import { loadLookups } from "../../api/lookups";
import { Loading, ErrorState } from "../../components/States";

function SvgIcon({ path, color, size = 18 }) {
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
function fmt(d) {
  try {
    return new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function StaffDashboard() {
  const { setPage, user } = useApp();
  const { data, loading, error, reload } = useFetch(
    () =>
      Promise.all([allBookings({ limit: 100 }), loadLookups()]).then(
        ([b, lk]) => ({ items: b.items, lk }),
      ),
    [],
  );

  if (loading) return <Loading label="Loading desk overview…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const items = data?.items || [];
  const lk = data?.lk;
  const pendingDevices = items.filter(
    (b) => b.status === "PENDING" && b.resourceType === "DEVICE",
  ).length;
  const waitlisted = items.filter((b) => b.status === "WAITLIST").length;
  const approved = items.filter((b) => b.status === "APPROVED").length;
  const completed = items.filter((b) => b.status === "COMPLETED").length;

  const stats = [
    {
      label: "Approved (live)",
      value: approved,
      iconBg: "#d7f8e9",
      iconColor: "#059669",
      iconPath: "M5 12l4 4L19 6",
    },
    {
      label: "Pending approvals",
      value: pendingDevices,
      iconBg: "#dbeafe",
      iconColor: "#3b82f6",
      iconPath: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
    },
    {
      label: "On waitlist",
      value: waitlisted,
      iconBg: "#fef2e2",
      iconColor: "#d97706",
      iconPath: "M4 7h16M4 12h16M4 17h10",
    },
    {
      label: "Completed",
      value: completed,
      iconBg: "#ede9fe",
      iconColor: "#7c3aed",
      iconPath: "M9 11l3 3L22 4",
    },
  ];

  const recent = items.slice(0, 8);

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 12, color: "#7c7e93", margin: "0 0 3px" }}>
          Library Staff · {user?.name}
        </p>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 26,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: 0,
          }}>
          Staff dashboard
        </h1>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 26,
        }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 13,
              padding: "18px 20px",
            }}>
            <div
              style={{
                background: stat.iconBg,
                borderRadius: 8,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}>
              <SvgIcon path={stat.iconPath} color={stat.iconColor} />
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 24,
                fontWeight: 700,
                color: "#1a1b2e",
                marginBottom: 2,
              }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "#7c7e93" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            padding: "22px 24px",
          }}>
          <h2
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 17,
              fontWeight: 600,
              color: "#1a1b2e",
              margin: "0 0 18px",
            }}>
            Recent bookings
          </h2>
          {recent.length === 0 ? (
            <div style={{ fontSize: 13, color: "#9b9db2" }}>
              No bookings yet.
            </div>
          ) : (
            recent.map((b, i) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 0",
                  borderBottom:
                    i < recent.length - 1 ? "1px solid #f3f3f8" : "none",
                }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: b.statusBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                  <SvgIcon
                    path="M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z"
                    color={b.statusCol}
                    size={16}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#1a1b2e" }}>
                    {lk ? lk.resourceName(b) : b.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#7c7e93" }}>
                    {lk ? lk.userName(b.userId) : "Member"} · {b.statusLabel}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#9b9db2", flexShrink: 0 }}>
                  {fmt(b.startAt)}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            onClick={() => setPage("checkout")}
            style={{
              background: "linear-gradient(135deg,#0c2a1a 0%,#15803d 100%)",
              borderRadius: 14,
              padding: "22px 22px",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}>
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}>
                <SvgIcon path="M9 3h6v13H9zM5 20h14" color="#fff" />
              </div>
              <div
                style={{
                  fontFamily: "'Spectral', serif",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: 4,
                }}>
                Checkout / Return desk
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                Scan booking & asset QR
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 600,
                }}>
                Open desk →
              </div>
            </div>
          </div>

          <div
            onClick={() => setPage("waitlistReview")}
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 14,
              padding: "20px 22px",
              cursor: "pointer",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}>
              <div
                style={{
                  background: "#fef2e2",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <SvgIcon path="M4 7h16M4 12h16M4 17h10" color="#d97706" />
              </div>
              <span
                style={{
                  background: "#fef2e2",
                  color: "#d97706",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 20,
                  border: "1px solid #fcd34d",
                }}>
                {waitlisted} queued
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Spectral', serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#1a1b2e",
                marginBottom: 3,
              }}>
              Waitlist review
            </div>
            <div style={{ fontSize: 12, color: "#7c7e93" }}>
              Flagged justifications need attention
            </div>
          </div>

          <div
            onClick={() => setPage("approvals")}
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 14,
              padding: "20px 22px",
              cursor: "pointer",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}>
              <div
                style={{
                  background: "#dbeafe",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <SvgIcon
                  path="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"
                  color="#3b82f6"
                />
              </div>
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 20,
                  border: "1px solid #bfdbfe",
                }}>
                {pendingDevices} pending
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Spectral', serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#1a1b2e",
                marginBottom: 3,
              }}>
              Device approvals
            </div>
            <div style={{ fontSize: 12, color: "#7c7e93" }}>
              Tier 4–5 pickup requests
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
