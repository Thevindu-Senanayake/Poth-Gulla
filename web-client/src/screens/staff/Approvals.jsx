import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { allBookings, approveBooking, rejectBooking } from "../../api/bookings";
import { loadLookups } from "../../api/lookups";
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

function initialsOf(name = "") {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
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

export default function Approvals() {
  const { showToast, refresh } = useApp();
  // Pending device approvals = PENDING device bookings (Tier 4–5).
  const { data, loading, error, reload } = useFetch(
    () =>
      Promise.all([
        allBookings({ status: "PENDING", resourceType: "DEVICE" }),
        loadLookups(),
      ]).then(([b, lk]) => ({ items: b.items, lk })),
    [],
  );

  if (loading) return <Loading label="Loading approvals…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const lk = data?.lk;
  const list = (data?.items || []).map((b) => ({
    ...b,
    userName: lk ? lk.userName(b.userId) : b.userName || "Member",
    title: lk ? lk.resourceName(b) : b.title,
  }));

  async function approve(id) {
    try {
      await approveBooking(id);
      showToast("Pickup approved");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not approve");
    }
  }
  async function reject(id) {
    try {
      await rejectBooking(id);
      showToast("Request rejected");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not reject");
    }
  }

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 12, color: "#7c7e93", margin: "0 0 3px" }}>
          Staff · Devices
        </p>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 26,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: 0,
          }}>
          Device approvals
        </h1>
      </div>

      <div
        style={{
          background: "#fffbeb",
          border: "1.5px solid #fde68a",
          borderRadius: 13,
          padding: "18px 22px",
          marginBottom: 28,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
        <div
          style={{
            background: "#fef2e2",
            borderRadius: 8,
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}>
          <SvgIcon
            path="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"
            color="#d97706"
            size={18}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#78350f",
              marginBottom: 4,
            }}>
            Tier 4–5 device approval required
          </div>
          <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
            High-value devices require explicit staff approval before pickup.
            Approving issues a pickup QR token; rejecting frees the request.
          </div>
        </div>
        {list.length > 0 && (
          <span
            style={{
              background: "#d97706",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20,
              flexShrink: 0,
              alignSelf: "flex-start",
            }}>
            {list.length} pending
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <Empty label="No pending device approvals." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "#fff",
                border: "1px solid #e7e7ef",
                borderRadius: 14,
                padding: "20px 22px",
              }}>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: entry.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                  }}>
                  {initialsOf(entry.userName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#1a1b2e",
                      marginBottom: 3,
                    }}>
                    {entry.userName || "Member"}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#7c7e93", marginBottom: 8 }}>
                    Device request
                  </div>
                  <div
                    style={{
                      background: "#f8f8fc",
                      border: "1px solid #e7e7ef",
                      borderRadius: 9,
                      padding: "12px 14px",
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9b9db2",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          marginBottom: 3,
                        }}>
                        Device
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1a1b2e",
                        }}>
                        {entry.title}
                      </div>
                    </div>
                    <div
                      style={{ width: 1, height: 32, background: "#e7e7ef" }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9b9db2",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          marginBottom: 3,
                        }}>
                        Schedule
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#4b4d63",
                        }}>
                        {fmt(entry.startAt)} → {fmt(entry.endAt)}
                      </div>
                    </div>
                  </div>
                  {entry.message && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#78350f",
                        background: "#fef4e6",
                        border: "1px solid #fde49e",
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}>
                      “{entry.message}”
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => reject(entry.id)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "1.5px solid #e7e7ef",
                    background: "#fff",
                    color: "#ef4444",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}>
                  Reject
                </button>
                <button
                  onClick={() => approve(entry.id)}
                  style={{
                    flex: 2,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(22,163,74,.25)",
                  }}>
                  Approve pickup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
