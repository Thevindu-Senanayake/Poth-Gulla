import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { allBookings } from "../../api/bookings";
import { listAllResources } from "../../api/catalogue";
import { queue, promote, dismiss } from "../../api/waitlist";
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
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 22px",
          width: 400,
          maxWidth: "92vw",
          boxShadow: "0 20px 50px rgba(6,24,15,0.22)",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}>
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
            }}>
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
            }}>
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
          }}>
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
            }}>
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
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Aggregate the staff review data: all WAITLIST bookings -> unique resources -> ordered queues.
async function loadReview() {
  const [waitBookings, resources] = await Promise.all([
    allBookings({ status: "WAITLIST" }),
    listAllResources(""),
  ]);
  const nameById = new Map(resources.map((r) => [r.id, r.title]));
  const msgByBooking = new Map(
    waitBookings.items.map((b) => [b.id, b.message]),
  );

  // Unique (resourceType, resourceKey) pairs that currently have queued bookings.
  const seen = new Set();
  const pairs = [];
  for (const b of waitBookings.items) {
    const key = `${b.resourceType}:${b.resourceId}`;
    if (b.resourceId && !seen.has(key)) {
      seen.add(key);
      pairs.push({ type: b.resourceType, key: b.resourceId });
    }
  }

  const queues = await Promise.all(
    pairs.map((p) => queue(p.type, p.key).catch(() => [])),
  );
  const entries = [];
  queues.forEach((q, i) => {
    q.forEach((e) =>
      entries.push({
        ...e,
        resourceName: nameById.get(pairs[i].key) || e.resourceType,
        message: msgByBooking.get(e.bookingId) || e.message || "",
      }),
    );
  });
  return entries;
}

export default function WaitlistReview() {
  const { showToast, refresh } = useApp();
  const { data, loading, error, reload } = useFetch(() => loadReview(), []);

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

  if (loading) return <Loading label="Loading waitlist queues…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const entries = data || [];
  const flagged = entries.filter((e) => e.hasMessage);
  const autoQueue = entries.filter((e) => !e.hasMessage);

  async function doPromote(id) {
    try {
      await promote(id);
      showToast("Promoted — booking approved");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not promote");
    }
  }
  async function doDecline(id) {
    try {
      await dismiss(id);
      showToast("Entry dismissed");
      refresh();
    } catch (e) {
      showToast(e?.response?.data?.message ?? "Could not dismiss");
    }
  }

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
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

      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 12, color: "#7c7e93", margin: "0 0 3px" }}>
          Staff · Waitlist
        </p>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 26,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: 0,
          }}>
          Waitlist review
        </h1>
      </div>

      <div
        style={{
          background: "linear-gradient(125deg,#0c2a1a 0%,#15803d 100%)",
          borderRadius: 13,
          padding: "18px 22px",
          marginBottom: 28,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 8,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}>
          <SvgIcon path="M4 7h16M4 12h16M4 17h10" color="#fff" />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 4,
            }}>
            Flagging system
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.6,
            }}>
            Entries with a justification message pause auto-promotion and float
            to the top for review. Promote one to approve its booking and issue
            a pickup QR; message-free entries auto-promote on a free event.
          </div>
        </div>
      </div>

      {/* Flagged */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}>
          <h2
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 17,
              fontWeight: 600,
              color: "#1a1b2e",
              margin: 0,
            }}>
            Flagged for review
          </h2>
          <span
            style={{
              background: "#fef2e2",
              color: "#d97706",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 9px",
              borderRadius: 20,
              border: "1px solid #fcd34d",
            }}>
            {flagged.length} pending
          </span>
        </div>
        {flagged.length === 0 ? (
          <Empty label="No message-flagged entries." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {flagged.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "#fff",
                  border: "1.5px solid #fcd34d",
                  borderRadius: 13,
                  padding: "20px 22px",
                  transition: "box-shadow 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.07)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 14,
                  }}>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1a1b2e",
                        marginBottom: 4,
                      }}>
                      {entry.resourceName}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#7c7e93",
                        background: "#f3f3f8",
                        borderRadius: 20,
                        padding: "2px 8px",
                      }}>
                      {entry.resourceType}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9b9db2",
                        marginBottom: 3,
                      }}>
                      Priority
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#16a34a",
                      }}>
                      {Math.round((entry.priorityScore ?? 0) * 10) / 10}
                    </div>
                  </div>
                </div>
                {entry.message && (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 16,
                    }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#d97706",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                      }}>
                      Member's justification
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#78350f",
                        margin: 0,
                        fontStyle: "italic",
                        lineHeight: 1.6,
                      }}>
                      "{entry.message}"
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() =>
                      askConfirm({
                        title: "Decline this entry?",
                        message: `Dismiss "${entry.resourceName}" from the waitlist? The member will be notified that their request was declined.`,
                        confirmLabel: "Decline",
                        confirmColor: "#ef4444",
                        onConfirm: () => doDecline(entry.id),
                      })
                    }
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
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#fef2f2";
                      e.currentTarget.style.borderColor = "#fecaca";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.borderColor = "#e7e7ef";
                    }}>
                    Decline
                  </button>
                  <button
                    onClick={() =>
                      askConfirm({
                        title: "Promote this entry?",
                        message: `Promote "${entry.resourceName}" to an approved booking? A pickup QR will be issued to the member.`,
                        confirmLabel: "Promote",
                        confirmColor: "#16a34a",
                        onConfirm: () => doPromote(entry.id),
                      })
                    }
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 8,
                      border: "none",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 10px rgba(22,163,74,.25)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#15803d";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#16a34a";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}>
                    Promote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto queue */}
      <div>
        <h2
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 17,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: "0 0 14px",
          }}>
          Automatic queue
        </h2>
        {autoQueue.length === 0 ? (
          <Empty label="No auto-promoting entries waiting." />
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 13,
              overflow: "hidden",
            }}>
            {autoQueue.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom:
                    i < autoQueue.length - 1 ? "1px solid #f3f3f8" : "none",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8faf9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#9b9db2",
                    width: 24,
                    textAlign: "center",
                    flexShrink: 0,
                  }}>
                  #{i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#1a1b2e",
                      marginBottom: 2,
                    }}>
                    {entry.resourceName}
                  </div>
                  <span style={{ fontSize: 11, color: "#7c7e93" }}>
                    {entry.resourceType}
                  </span>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{ fontSize: 10, color: "#9b9db2", marginBottom: 2 }}>
                    Priority
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#7c7e93",
                    }}>
                    {Math.round((entry.priorityScore ?? 0) * 10) / 10}
                  </div>
                </div>
                <button
                  onClick={() =>
                    askConfirm({
                      title: "Promote this entry?",
                      message: `Manually promote "${entry.resourceName}" to an approved booking? This overrides the automatic queue order.`,
                      confirmLabel: "Promote",
                      confirmColor: "#16a34a",
                      onConfirm: () => doPromote(entry.id),
                    })
                  }
                  style={{
                    fontSize: 11,
                    color: "#16a34a",
                    background: "#d7f8e9",
                    border: "1px solid #bbf7d0",
                    borderRadius: 20,
                    padding: "4px 12px",
                    flexShrink: 0,
                    cursor: "pointer",
                    fontWeight: 700,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#bbf7d0";
                    e.currentTarget.style.borderColor = "#86efac";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#d7f8e9";
                    e.currentTarget.style.borderColor = "#bbf7d0";
                  }}>
                  Promote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
