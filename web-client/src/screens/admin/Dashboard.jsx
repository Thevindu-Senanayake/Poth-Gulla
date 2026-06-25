import { useFetch } from "../../hooks/useFetch";
import { listUsers } from "../../api/users";
import { allBookings } from "../../api/bookings";
import { listBooks, listDevices, listRooms } from "../../api/catalogue";
import { auditLogs as fetchAuditLogs } from "../../api/misc";
import { colorFor } from "../../api/adapters";
import { Loading, ErrorState } from "../../components/States";

const STAT_ICONS = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  book: "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z",
  alert:
    "M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z",
  inbox:
    "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
};

const TIER_COL = {
  1: "#ef4444",
  2: "#d97706",
  3: "#16a34a",
  4: "#3b82f6",
  5: "#8b5cf6",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function loadAdmin() {
  const [users, bookings, books, devices, rooms, audit] = await Promise.all([
    listUsers({ limit: 200 }),
    allBookings({ limit: 200 }),
    listBooks({ limit: 1 }),
    listDevices({ limit: 1 }),
    listRooms(),
    fetchAuditLogs({ limit: 6 }),
  ]);
  return {
    users: users.items,
    usersTotal: users.total,
    bookings: bookings.items,
    booksTotal: books.total || 0,
    devicesTotal: devices.total || 0,
    roomsTotal: rooms.items?.length || 0,
    auditEntries: audit?.items || [],
  };
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => loadAdmin(), []);
  if (loading) return <Loading label="Loading system overview…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const {
    users,
    usersTotal,
    bookings,
    booksTotal,
    devicesTotal,
    roomsTotal,
    auditEntries,
  } = data;

  const activeMembers = users.filter((u) => u.isActive).length;
  const resTotal = booksTotal + devicesTotal + roomsTotal;
  const now = Date.now();

  const overdueItems = bookings.filter(
    (b) =>
      b.status === "CHECKED_OUT" &&
      b.endAt &&
      new Date(b.endAt).getTime() < now,
  ).length;
  const pendingApprovals = bookings.filter(
    (b) => b.status === "PENDING",
  ).length;
  const newMembers = users.filter(
    (u) =>
      u.raw?.createdAt &&
      now - new Date(u.raw.createdAt).getTime() < SEVEN_DAYS_MS,
  ).length;

  const adminStats = [
    {
      label: "Members",
      value: usersTotal,
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
      iconPath: STAT_ICONS.users,
      trend: `${activeMembers} active · +${newMembers} this week`,
      trendColor: "#10b981",
    },
    {
      label: "Resources",
      value: resTotal,
      iconBg: "#fce7f3",
      iconColor: "#db2777",
      iconPath: STAT_ICONS.book,
      trend: `${booksTotal} books · ${devicesTotal} devices · ${roomsTotal} rooms`,
      trendColor: "#7c7e93",
    },
    {
      label: "Overdue items",
      value: overdueItems,
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      iconPath: STAT_ICONS.alert,
      trend: overdueItems > 0 ? "needs follow-up" : "all clear",
      trendColor: overdueItems > 0 ? "#dc2626" : "#10b981",
    },
    {
      label: "Pending approvals",
      value: pendingApprovals,
      iconBg: "#fef4e6",
      iconColor: "#d97706",
      iconPath: STAT_ICONS.inbox,
      trend: "device requests awaiting staff",
      trendColor: "#d97706",
    },
  ];

  // 7-day booking bars from createdAt.
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: d.toDateString(),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      n: 0,
    };
  });
  const dayMap = new Map(days.map((d) => [d.key, d]));
  bookings.forEach((b) => {
    const k = new Date(b.raw?.createdAt || b.startAt).toDateString();
    if (dayMap.has(k)) dayMap.get(k).n++;
  });
  const maxN = Math.max(1, ...days.map((d) => d.n));

  const patrons = users.filter((u) => u.tierNum >= 1);
  const tierDist = [1, 2, 3, 4, 5].map((t) => {
    const n = patrons.filter((u) => u.tierNum === t).length;
    const pct = patrons.length ? Math.round((n / patrons.length) * 100) : 0;
    return {
      tier: `Tier ${t}`,
      pct: `${pct}%`,
      w: `${pct}%`,
      col: TIER_COL[t],
    };
  });

  // Catalogue mix — proportional bars.
  const resourceMix = [
    { label: "Books", n: booksTotal, col: "#16a34a" },
    { label: "Devices", n: devicesTotal, col: "#3b82f6" },
    { label: "Rooms", n: roomsTotal, col: "#a855f7" },
  ];
  const mixTotal = Math.max(
    1,
    resourceMix.reduce((s, r) => s + r.n, 0),
  );

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      <div style={{ marginBottom: 26 }}>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#1a1b2e",
            margin: "0 0 4px",
          }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#7c7e93", margin: 0 }}>
          System overview · Poth Gulla Smart Library
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 24,
        }}>
        {adminStats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 13,
              padding: "18px 20px",
              transition: "transform .15s, box-shadow .15s, border-color .15s",
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={stat.iconColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                {stat.iconPath
                  .split("M")
                  .filter(Boolean)
                  .map((d, j) => (
                    <path key={j} d={"M" + d} />
                  ))}
              </svg>
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
            <div style={{ fontSize: 12, color: "#7c7e93", marginBottom: 4 }}>
              {stat.label}
            </div>
            <div
              style={{ fontSize: 11, color: stat.trendColor, fontWeight: 600 }}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}>
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
              margin: "0 0 20px",
            }}>
            Bookings — last 7 days
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              height: 130,
            }}>
            {days.map((bar, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#9b9db2",
                  }}>
                  {bar.n}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(8, (bar.n / maxN) * 110)}px`,
                    background: "linear-gradient(180deg,#22c55e,#15803d)",
                    borderRadius: "5px 5px 2px 2px",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: "#9b9db2",
                    fontWeight: 600,
                  }}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

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
            Member tier distribution
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tierDist.map((tier, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}>
                  <span
                    style={{ fontSize: 12, color: "#3a3b4e", fontWeight: 600 }}>
                    {tier.tier}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: tier.col,
                      fontWeight: 700,
                    }}>
                    {tier.pct}
                  </span>
                </div>
                <div
                  style={{
                    background: "#f0f0f6",
                    borderRadius: 20,
                    height: 7,
                    overflow: "hidden",
                  }}>
                  <div
                    style={{
                      width: tier.w,
                      height: "100%",
                      background: tier.col,
                      borderRadius: 20,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resources mix + Recent admin activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 18,
        }}>
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
            Catalogue mix
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {resourceMix.map((r) => {
              const pct = Math.round((r.n / mixTotal) * 100);
              return (
                <div key={r.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#3a3b4e",
                        fontWeight: 600,
                      }}>
                      {r.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: r.col,
                        fontWeight: 700,
                      }}>
                      {r.n} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#f0f0f6",
                      borderRadius: 20,
                      height: 7,
                      overflow: "hidden",
                    }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: r.col,
                        borderRadius: 20,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
              margin: "0 0 14px",
            }}>
            Recent admin activity
          </h2>
          {auditEntries.length === 0 ? (
            <div style={{ fontSize: 13, color: "#9b9db2" }}>
              No recent activity recorded.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {auditEntries.slice(0, 6).map((l) => {
                const col = colorFor(l.targetType || l.action || "x");
                const when = l.createdAt
                  ? new Date(l.createdAt).toLocaleString()
                  : "";
                return (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "8px 0",
                      borderBottom: "1px solid #f0f0f6",
                    }}>
                    <div
                      style={{
                        width: 6,
                        alignSelf: "stretch",
                        background: col,
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1a1b2e",
                        }}>
                        {(l.action || "").replace(/_/g, " ")}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#7c7e93",
                          marginTop: 2,
                        }}>
                        {l.actor?.name || "System"} · {when}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
