import { useEffect } from "react";
import { useApp } from "../../App";

export default function ResourceDetail() {
  const { selectedResource, setPage, openBooking, user } = useApp();

  useEffect(() => {
    if (!selectedResource) setPage("search");
  }, [selectedResource]);

  if (!selectedResource) return null;

  const r = selectedResource;
  const isAvail = r.available > 0;
  const needsTierWarn = r.tier && r.tier >= 4;

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      {/* Back button */}
      <button
        onClick={() => setPage("search")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "#16a34a",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: "0 0 20px",
          fontFamily: "'Public Sans', sans-serif",
        }}>
        ← Back to results
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 28,
          alignItems: "start",
        }}>
        {/* Left: resource card */}
        <div>
          <div
            style={{
              background: r.color,
              borderRadius: 16,
              height: 340,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginBottom: 14,
            }}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round">
              {r.iconPath
                .split("M")
                .filter(Boolean)
                .map((d, j) => (
                  <path key={j} d={"M" + d} />
                ))}
            </svg>
            {r.tier && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: 14,
                  background: "#f59e0b",
                  color: "#1c1000",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 7,
                  padding: "4px 10px",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}>
                Tier {r.tier}+ Required
              </div>
            )}
          </div>

          {/* Info panel */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e7ef",
              borderRadius: 13,
              padding: "16px 18px",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}>
              <span
                style={{
                  fontSize: 12,
                  color: "#7c7e93",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}>
                Availability
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isAvail ? "#059669" : "#db2777",
                  background: isAvail ? "#d7f8e9" : "#fce7f3",
                  borderRadius: 6,
                  padding: "4px 9px",
                }}>
                {isAvail ? "Available" : "Fully booked"}
              </span>
            </div>
            {r.copies > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#1a1b2e",
                  marginBottom: 8,
                }}>
                <span style={{ color: "#7c7e93" }}>Copies</span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600,
                  }}>
                  {r.available} / {r.copies}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#1a1b2e",
                marginBottom: 8,
              }}>
              <span style={{ color: "#7c7e93" }}>Category</span>
              <span style={{ fontWeight: 600 }}>{r.cat}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#1a1b2e",
                marginBottom: r.serial ? 8 : 0,
              }}>
              <span style={{ color: "#7c7e93" }}>Type</span>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                {r.type}
              </span>
            </div>
            {r.serial && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#1a1b2e",
                }}>
                <span style={{ color: "#7c7e93" }}>Serial no.</span>
                <span
                  style={{
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                  {r.serial}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: detail content */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#16a34a",
                background: "#d7f8e9",
                borderRadius: 6,
                padding: "3px 9px",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
              {r.cat}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 30,
              fontWeight: 600,
              color: "#1a1b2e",
              margin: "10px 0 6px",
              lineHeight: 1.2,
            }}>
            {r.title}
          </h1>
          <p style={{ fontSize: 14, color: "#7c7e93", margin: "0 0 18px" }}>
            {r.author}
          </p>

          {/* Tags */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 20,
            }}>
            {(r.tags || []).map((tag) => (
              <span
                key={tag}
                style={{
                  background: "#f4f4f8",
                  color: "#5a5c74",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Tier warning */}
          {needsTierWarn && (
            <div
              style={{
                background: "#fef4e6",
                border: "1px solid #fde49e",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#92400e",
                    marginBottom: 2,
                  }}>
                  Requires Tier {r.tier} access
                </div>
                <div style={{ fontSize: 12, color: "#a16207" }}>
                  Your current tier may not meet the requirement. Submitting a
                  request will go to staff for approval.
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div
            style={{
              background: "#f8f8fc",
              border: "1px solid #e7e7ef",
              borderRadius: 10,
              padding: "16px 18px",
              marginBottom: 28,
            }}>
            <h3
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#7c7e93",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                margin: "0 0 8px",
              }}>
              About
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#3a3b52",
                lineHeight: 1.65,
                margin: 0,
              }}>
              {r.blurb}
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => openBooking(r)}
            style={{
              background: isAvail ? "#16a34a" : "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "13px 28px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Public Sans', sans-serif",
              letterSpacing: 0.2,
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            {r.type === "room"
              ? "Reserve room"
              : isAvail
                ? "Book now"
                : "Join waitlist"}
          </button>

          {!isAvail && (
            <p style={{ fontSize: 12, color: "#9b9db2", marginTop: 10 }}>
              Priority score is calculated as: tier × 0.6 + role × 0.4
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
