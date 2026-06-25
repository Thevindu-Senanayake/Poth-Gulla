import { useEffect, useRef, useState } from "react";

// Zero-dependency QR scanner using the BarcodeDetector API where available
// (Chrome/Edge desktop + Android). Falls back to manual entry on browsers
// without support (Safari, Firefox). Calls `onDetect(text)` exactly once
// per scan; the caller is expected to close / unmount on success.
export default function QRScanner({ onDetect, onError }) {
  const videoRef = useRef(null);
  const [streamReady, setStreamReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const lastValueRef = useRef("");

  useEffect(() => {
    let stream;
    let cancelled = false;
    let raf;

    const Detector = window.BarcodeDetector;
    if (!Detector) {
      setSupported(false);
      return;
    }

    const detector = new Detector({ formats: ["qr_code"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStreamReady(true);

        const tick = async () => {
          if (cancelled || !video.videoWidth) {
            raf = requestAnimationFrame(tick);
            return;
          }
          try {
            const found = await detector.detect(video);
            if (found && found[0]?.rawValue) {
              const value = found[0].rawValue;
              if (value !== lastValueRef.current) {
                lastValueRef.current = value;
                onDetect?.(value);
                return; // caller should unmount; stop polling
              }
            }
          } catch {
            // ignore intermittent detect errors
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        onError?.(e);
        setSupported(false);
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect, onError]);

  if (!supported) {
    return (
      <div
        style={{
          padding: "20px",
          borderRadius: 10,
          background: "#fef9c3",
          border: "1px solid #fde68a",
          color: "#854d0e",
          fontSize: 13,
          textAlign: "center",
        }}>
        Camera scanning is not available in this browser. Type the code below
        instead.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        background: "#000",
        borderRadius: 12,
        overflow: "hidden",
        aspectRatio: "1 / 1",
        maxWidth: 360,
        margin: "0 auto",
      }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "18%",
          border: "2px solid rgba(34,197,94,0.85)",
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
          pointerEvents: "none",
        }}
      />
      {!streamReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 13,
          }}>
          Starting camera…
        </div>
      )}
    </div>
  );
}
