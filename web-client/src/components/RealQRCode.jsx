import { useEffect, useRef, useState } from 'react';

// Renders a real, scannable QR for the given `value` (asset tag, room QR,
// etc.). Replaces the mock visual pattern in /data/mockData.js.
//
// Loads the `qrcode` library from a CDN once on mount, so no npm install
// is required. If the CDN is unreachable (offline kiosk, locked-down LAN)
// the component falls back to the public api.qrserver.com PNG renderer.
//
// For an offline-only install: `npm i qrcode` and replace the dynamic
// loader with `import QRCode from "qrcode";`.

const CDN_URL = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
const FALLBACK_PNG = (value, size) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

let libPromise = null;
function loadQRCodeLib() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = CDN_URL;
        s.async = true;
        s.onload = () => resolve(window.QRCode || null);
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
    });
    return libPromise;
}

export default function RealQRCode({ value, size = 200, label, showValue = true }) {
    const canvasRef = useRef(null);
    const [fallback, setFallback] = useState(false);
    const text = (value || '').trim();

    useEffect(() => {
        let cancelled = false;
        if (!text) return;
        loadQRCodeLib().then((lib) => {
            if (cancelled) return;
            if (!lib || !canvasRef.current) {
                setFallback(true);
                return;
            }
            try {
                lib.toCanvas(
                    canvasRef.current,
                    text,
                    {
                        width: size,
                        margin: 1,
                        errorCorrectionLevel: 'M',
                        color: { dark: '#0c2a1a', light: '#ffffff' },
                    },
                    (err) => {
                        if (err) setFallback(true);
                    }
                );
            } catch {
                setFallback(true);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [text, size]);

    if (!text) {
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    background: '#f4f4f8',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9b9db2',
                    fontSize: 12,
                }}
            >
                No code yet
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
            }}
        >
            {fallback ? (
                <img
                    src={FALLBACK_PNG(text, size)}
                    alt={`QR · ${text}`}
                    width={size}
                    height={size}
                    style={{
                        display: 'block',
                        border: '6px solid #0c2a1a',
                        borderRadius: 10,
                        background: '#fff',
                    }}
                />
            ) : (
                <canvas
                    ref={canvasRef}
                    width={size}
                    height={size}
                    style={{
                        display: 'block',
                        border: '6px solid #0c2a1a',
                        borderRadius: 10,
                        background: '#fff',
                    }}
                />
            )}
            {showValue && (
                <code
                    style={{
                        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#0c2a1a',
                        background: '#f4f4f8',
                        border: '1px solid #e7e7ef',
                        borderRadius: 6,
                        padding: '3px 10px',
                        letterSpacing: 0.5,
                        wordBreak: 'break-all',
                        maxWidth: size + 12,
                        textAlign: 'center',
                    }}
                    aria-label={label || 'asset tag'}
                >
                    {text}
                </code>
            )}
        </div>
    );
}
