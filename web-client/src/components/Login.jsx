import { useState } from "react";
import { useApp } from "../App";

const BOOK_SVG = "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z";

// Library photo backdrop with a green overlay; falls back to the green color if the image fails.
const LIBRARY_IMG =
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80";

export default function Login() {
  const { signIn } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e?.response?.data?.message ?? e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Public Sans', system-ui, sans-serif",
        overflow: "hidden",
        padding: 24,
        backgroundColor: "#0c2a1a",
        backgroundImage: `linear-gradient(150deg, rgba(12,42,26,0.92) 0%, rgba(22,101,52,0.82) 55%, rgba(34,197,94,0.72) 100%), url("${LIBRARY_IMG}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
      {/* Decorative soft blobs */}
      <div
        style={{
          position: "absolute",
          right: -90,
          top: -70,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(245,158,11,.18), transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -70,
          bottom: -90,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,.25), transparent 70%)",
        }}
      />

      {/* Centered card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,0.98)",
          borderRadius: 22,
          padding: "40px 38px 32px",
          boxShadow: "0 30px 70px rgba(0,0,0,.35)",
          backdropFilter: "blur(4px)",
        }}>
        {/* Logo + brand, centered */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 26,
          }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: "linear-gradient(135deg,#16a34a,#22c55e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(22,163,74,.35)",
              marginBottom: 14,
            }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d={BOOK_SVG} />
              <path d="M5 19a1 1 0 0 1 1-1h13" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "Spectral, Georgia, serif",
              fontWeight: 700,
              fontSize: 24,
              color: "#16231b",
            }}>
            Poth Gulla
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              color: "#16a34a",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              marginTop: 3,
            }}>
            Smart Library System
          </div>
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#16231b",
            marginBottom: 4,
            textAlign: "center",
          }}>
          Welcome back
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#7c7e93",
            marginBottom: 24,
            textAlign: "center",
          }}>
          Sign in to your account
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#5c5e72",
              display: "block",
              marginBottom: 6,
            }}>
            Email address
          </label>
          <input
            type="email"
            value={email}
            autoFocus
            placeholder="you@iit.ac.lk"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#5c5e72",
              display: "block",
              marginBottom: 6,
            }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 10,
              padding: "9px 13px",
              fontSize: 12.5,
              marginBottom: 16,
            }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: loading
              ? "#86efac"
              : "linear-gradient(135deg,#16a34a,#22c55e)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            boxShadow: "0 6px 18px rgba(22,163,74,.32)",
          }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 11.5,
            color: "#9b9db2",
          }}>
          Meridian University · Poth Gulla
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1.5px solid #e7e7ef",
  background: "#f8f8fc",
  fontSize: 13.5,
  color: "#16231b",
  outline: "none",
  boxSizing: "border-box",
};
