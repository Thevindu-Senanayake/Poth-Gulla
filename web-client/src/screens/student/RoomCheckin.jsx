import { useState } from "react";
import { useApp } from "../../App";
import { roomCheckin } from "../../api/misc";
import QRScanner from "../../components/QRScanner";

// Walk-up room access: student scans the QR sticker on a study-room door.
// Backend (/scan/room-checkin) creates a same-day booking + check-in if the
// room is free, or rejects with a clear reason if it's already reserved.
export default function RoomCheckin() {
  const { showToast, refresh } = useApp();
  const [scanning, setScanning] = useState(false);
  const [roomQr, setRoomQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function submit(value) {
    const v = (value ?? roomQr).trim();
    if (!v) {
      showToast("Enter or scan a room code");
      return;
    }
    setBusy(true);
    try {
      const res = await roomCheckin(v);
      const roomName = res?.studyRoom?.name || res?.title || "the room";
      showToast(`Checked into ${roomName}`);
      setLastResult({ ok: true, name: roomName });
      setRoomQr("");
      setScanning(false);
      refresh();
    } catch (e) {
      const msg =
        e?.response?.data?.message ?? "Could not check into this room.";
      showToast(msg);
      setLastResult({ ok: false, msg });
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
        maxWidth: 640,
        margin: "0 auto",
      }}>
      <h1
        style={{
          fontFamily: "'Spectral', serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#1a1b2e",
          margin: "0 0 4px",
        }}>
        Walk-up room check-in
      </h1>
      <p style={{ fontSize: 13, color: "#7c7e93", margin: "0 0 24px" }}>
        Scan the QR code on a study-room door to claim it without a prior
        booking. If the room is already reserved you'll see why.
      </p>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e7ef",
          borderRadius: 14,
          padding: "22px 22px",
        }}>
        {scanning ? (
          <>
            <QRScanner
              onDetect={(v) => submit(v)}
              onError={() => setScanning(false)}
            />
            <button
              onClick={() => setScanning(false)}
              style={{
                width: "100%",
                marginTop: 14,
                background: "#f0f0f6",
                color: "#3a3b4e",
                border: "none",
                borderRadius: 9,
                padding: "11px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}>
              Stop camera
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setScanning(true)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 16,
              }}>
              Scan room QR
            </button>
            <div
              style={{
                fontSize: 11,
                color: "#9b9db2",
                textAlign: "center",
                marginBottom: 10,
              }}>
              OR type the code printed below the QR
            </div>
            <input
              value={roomQr}
              onChange={(e) => setRoomQr(e.target.value)}
              placeholder="e.g. ROOM-POD-A-12345"
              style={{
                width: "100%",
                border: "1.5px solid #e7e7ef",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "'IBM Plex Mono', monospace",
                background: "#f8f8fc",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />
            <button
              onClick={() => submit()}
              disabled={busy}
              style={{
                width: "100%",
                background: busy ? "#86efac" : "#0c2a1a",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "11px",
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
              }}>
              {busy ? "Checking in…" : "Check in"}
            </button>
          </>
        )}

        {lastResult && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 9,
              fontSize: 12,
              background: lastResult.ok ? "#f0fdf4" : "#fef2f2",
              color: lastResult.ok ? "#166534" : "#b91c1c",
              border: `1px solid ${lastResult.ok ? "#bbf7d0" : "#fecaca"}`,
            }}>
            {lastResult.ok
              ? `Checked into ${lastResult.name}. Enjoy your session.`
              : lastResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}
