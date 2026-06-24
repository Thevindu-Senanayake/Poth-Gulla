import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { myBookings } from "../../api/bookings";
import { myWaitlist } from "../../api/waitlist";

export default function Profile() {
  const { user } = useApp();
  const [contactOpen, setContactOpen] = useState(false);
  const { data } = useFetch(
    () =>
      Promise.all([myBookings(), myWaitlist()]).then(([b, w]) => ({
        bookings: b.items,
        waitlist: w,
      })),
    [],
  );

  const bookings = data?.bookings || [];
  const profileStats = [
    { label: "Total bookings", value: bookings.length },
    {
      label: "Active loans",
      value: bookings.filter((b) => b.status === "APPROVED").length,
    },
    { label: "On waitlist", value: (data?.waitlist || []).length },
  ];

  return (
    <div
      className="pg-screen"
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
      }}
    >
      {/* Profile header */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px",
          border: "1px solid #e7e7ef",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: user?.avatarBg || "#f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 26,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {user?.initials || "SW"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#16231b",
              marginBottom: 2,
            }}
          >
            {user?.name || "Sahan Wickrama"}
          </div>
          <div style={{ fontSize: 13, color: "#7c7e93", marginBottom: 8 }}>
            {user?.email || "sahan@meridian.edu"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                background: "#f0fdf4",
                color: "#16a34a",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {user?.tierLabel || "Tier 3 · Regular"}
            </div>
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                background: "#f4f4f8",
                color: "#5c5e72",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {user?.roleLabel || "Student"}
            </div>
          </div>
        </div>
        <button
          onClick={() => setContactOpen(true)}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            background: "linear-gradient(135deg,#16a34a,#22c55e)",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Edit Profile
        </button>
      </div>

      {/* Profile fields are administrator-managed (account CRUD is Admin/Staff only). */}
      {contactOpen && (
        <div
          onClick={() => setContactOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(6,24,15,0.58)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: 420,
              maxWidth: "92vw",
              padding: "26px 26px 22px",
              boxShadow: "0 24px 60px rgba(6,24,15,0.22)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                marginBottom: 14,
                background: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: "'Spectral', serif",
                fontSize: 19,
                fontWeight: 700,
                color: "#16231b",
                margin: "0 0 8px",
              }}
            >
              Contact an administrator
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#5c5e72",
                lineHeight: 1.55,
                margin: "0 0 20px",
              }}
            >
              Profile details - your name, email, role and tier - are managed by
              library staff. To request a change, please contact an
              administrator at{" "}
              <a
                href="mailto:admin@iit.ac.lk"
                style={{ color: "#16a34a", fontWeight: 600 }}
              >
                admin@iit.ac.lk
              </a>
              .
            </p>
            <button
              onClick={() => setContactOpen(false)}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 9,
                border: "none",
                background: "#16a34a",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {profileStats.map((s, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "18px 20px",
              border: "1px solid #e7e7ef",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: "#16231b" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#7c7e93", marginTop: 3 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Account details */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e7e7ef",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f8",
            fontWeight: 600,
            color: "#16231b",
            fontSize: 14,
          }}
        >
          Account Details
        </div>
        {[
          { label: "Email", value: user?.email || "-" },
          { label: "Role", value: user?.roleLabel || "-" },
          { label: "Tier", value: user?.tierLabel || "-" },
          {
            label: "Account status",
            value: user?.isActive === false ? "Suspended" : "Active",
          },
          {
            label: "Current points",
            value: `${(user?.points ?? 0).toLocaleString()} pts`,
          },
        ].map((row, i, arr) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "13px 20px",
              borderBottom: i < arr.length - 1 ? "1px solid #f0f0f8" : "none",
            }}
          >
            <div style={{ fontSize: 13, color: "#7c7e93" }}>{row.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#16231b" }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
