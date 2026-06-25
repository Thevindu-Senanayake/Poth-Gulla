import { useState } from "react";
import { useApp } from "../../App";
import { scanCheckout, scanReturn } from "../../api/misc";
import QRScanner from "../../components/QRScanner";

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

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid #e7e7ef",
  fontSize: 13,
  color: "#1a1b2e",
  fontFamily: "'IBM Plex Mono', monospace",
  outline: "none",
  boxSizing: "border-box",
  background: "#f8f8fc",
};

export default function Checkout() {
  const { staffScan, setStaffScan, showToast } = useApp();
  // The printed QR on every resource encodes the asset tag, so checkout and
  // return both need only one value.
  const [assetTag, setAssetTag] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const isCheckout = staffScan.mode === "checkout";

  function setMode(mode) {
    setStaffScan((prev) => ({ ...prev, mode, stage: "ready" }));
    setResult(null);
    setAssetTag("");
    setScanning(false);
  }

  async function submit(rawTag) {
    setBusy(true);
    setResult(null);
    try {
      const tag = (rawTag ?? assetTag).trim();
      if (!tag) throw new Error("Scan or enter the asset tag");
      if (isCheckout) {
        // Backend resolves the booking from the asset tag — same value is
        // sent in both body fields for compatibility with the existing route.
        const b = await scanCheckout(tag, tag);
        setResult({
          ok: true,
          msg: `Checked out · booking ${String(b.id).slice(0, 8)}`,
        });
        showToast("Checked out successfully");
      } else {
        const b = await scanReturn(tag, condition);
        setResult({
          ok: true,
          msg: `Return processed · borrowing ${String(b.id).slice(0, 8)}`,
        });
        showToast("Return processed");
      }
      setAssetTag("");
      setScanning(false);
    } catch (e) {
      const data = e?.response?.data;
      const status = e?.response?.status;
      const base =
        (typeof data === "string" && data) ||
        data?.message ||
        data?.error ||
        e?.message ||
        "Scan failed";
      const msg = status ? `${base} (HTTP ${status})` : base;
      setResult({ ok: false, msg });
      showToast(typeof msg === "string" ? msg : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        padding: "30px 30px 40px",
        fontFamily: "'Public Sans', sans-serif",
        minHeight: "100%",
      }}>
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 12, color: "#7c7e93", margin: "0 0 3px" }}>
          Staff · Desk
        </p>
        <h1
          style={{
            fontFamily: "'Spectral', serif",
            fontSize: 26,
            fontWeight: 600,
            color: "#1a1b2e",
            margin: 0,
          }}>
          Checkout / Return desk
        </h1>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e7ef",
            borderRadius: 14,
            padding: "24px 26px",
          }}>
          <div
            style={{
              display: "flex",
              background: "#f3f3f8",
              borderRadius: 10,
              padding: 4,
              gap: 4,
              marginBottom: 26,
            }}>
            {["checkout", "return"].map((mode) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  background:
                    staffScan.mode === mode ? "#16a34a" : "transparent",
                  color: staffScan.mode === mode ? "#fff" : "#7c7e93",
                  boxShadow:
                    staffScan.mode === mode
                      ? "0 2px 8px rgba(22,163,74,.25)"
                      : "none",
                }}>
                {mode === "checkout" ? "Check out" : "Return"}
              </button>
            ))}
          </div>

          {/* Real camera scanner — uses BarcodeDetector when available
              (Chrome / Edge / Android). On Safari / Firefox the component
              falls back to the manual entry field below. */}
          <div style={{ marginBottom: 22 }}>
            {scanning ? (
              <>
                <QRScanner
                  onDetect={(val) => submit(val)}
                  onError={() => setScanning(false)}
                />
                <button
                  onClick={() => setScanning(false)}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    background: "#f0f0f6",
                    color: "#3a3b4e",
                    border: "none",
                    borderRadius: 9,
                    padding: "10px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}>
                  Stop camera
                </button>
              </>
            ) : (
              <button
                onClick={() => setScanning(true)}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg,#16a34a,#22c55e)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scan QR with camera
              </button>
            )}
          </div>

          {/* Manual entry — used when the camera isn't available or a USB
              barcode scanner is wired up (it types into the focused input). */}
          {isCheckout ? (
            <>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#5c5e72",
                  display: "block",
                  marginBottom: 6,
                }}>
                Asset tag
              </label>
              <input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Scan the QR or type the asset tag"
                autoFocus
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "#9b9db2",
                  marginBottom: 18,
                }}>
                One scan is enough — the QR encodes the asset tag and the system
                finds the member's approved booking from it.
              </div>
            </>
          ) : (
            <>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#5c5e72",
                  display: "block",
                  marginBottom: 6,
                }}>
                Asset tag
              </label>
              <input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="Scan the item's asset tag"
                autoFocus
                style={{ ...inputStyle, marginBottom: 14 }}
              />
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#5c5e72",
                  display: "block",
                  marginBottom: 6,
                }}>
                Condition
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {["GOOD", "DAMAGED"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      border:
                        condition === c
                          ? `1.5px solid ${c === "GOOD" ? "#16a34a" : "#ef4444"}`
                          : "1.5px solid #e7e7ef",
                      background:
                        condition === c
                          ? c === "GOOD"
                            ? "#f0fdf4"
                            : "#fee2e2"
                          : "#fff",
                      color:
                        condition === c
                          ? c === "GOOD"
                            ? "#16a34a"
                            : "#ef4444"
                          : "#7c7e93",
                    }}>
                    {c === "GOOD" ? "Good" : "Damaged"}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            onClick={submit}
            disabled={busy}
            style={{
              width: "100%",
              background: busy ? "#86efac" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              boxShadow: "0 3px 12px rgba(22,163,74,.3)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.background = "#15803d";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = busy ? "#86efac" : "#16a34a";
              e.currentTarget.style.transform = "translateY(0)";
            }}>
            {busy
              ? "Processing…"
              : isCheckout
                ? "Process checkout"
                : "Process return"}
          </button>

          {result && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 14px",
                borderRadius: 9,
                background: result.ok ? "#dcfce7" : "#fee2e2",
                border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>
              <SvgIcon
                path={result.ok ? "M5 12l4 4L19 6" : "M18 6L6 18M6 6l12 12"}
                color={result.ok ? "#16a34a" : "#ef4444"}
                size={16}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: result.ok ? "#15803d" : "#b91c1c",
                }}>
                {result.msg}
              </span>
            </div>
          )}
        </div>

        {/* Right panel: how it works */}
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
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1b2e",
              margin: "0 0 16px",
            }}>
            How the desk works
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              color: "#4b4d63",
              fontSize: 13,
              lineHeight: 1.9,
            }}>
            <li>
              <strong>Checkout</strong> - scan the member's <em>booking QR</em>{" "}
              (an APPROVED booking) then the item's <em>asset tag</em>. The
              copy/device is marked borrowed.
            </li>
            <li>
              <strong>Return</strong> - scan the item's <em>asset tag</em> and
              pick a condition. Points are scored automatically and the next
              waitlist entry is auto-promoted.
            </li>
            <li>
              Tier 4–5 device requests must be approved under{" "}
              <strong>Device approvals</strong> before they can be checked out.
            </li>
          </ol>
          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "#7c7e93",
              background: "#f8f8fc",
              border: "1px solid #e7e7ef",
              borderRadius: 9,
              padding: "12px 14px",
            }}>
            A hardware scanner simply types into the fields on the left - no
            camera integration required.
          </div>
        </div>
      </div>
    </div>
  );
}
