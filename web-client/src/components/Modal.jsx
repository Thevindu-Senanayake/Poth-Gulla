import { useEffect } from "react";
import { createPortal } from "react-dom";

// Renders children through a portal attached to document.body so the overlay
// always covers the full viewport — independent of any ancestor that creates
// a containing block via transform / filter / will-change / animation.
//
// Use this for any modal that needs the dim + blur backdrop to cover the
// sidebar as well as the content area.
export default function Modal({
  open,
  onClose,
  width = 440,
  children,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(6,24,15,0.58)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Public Sans', sans-serif",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width,
          maxWidth: "92vw",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(6,24,15,0.22)",
        }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
