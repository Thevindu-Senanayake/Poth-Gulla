import { useState } from "react";
import { BOOK_ICON, DEVICE_ICON, ROOM_ICON } from "../api/adapters";

const ICON = {
  BOOK: BOOK_ICON,
  DEVICE: DEVICE_ICON,
  ROOM: ROOM_ICON,
  book: BOOK_ICON,
  device: DEVICE_ICON,
  room: ROOM_ICON,
};

// Renders a real resource thumbnail (book cover / device photo) inside the same
// coloured block the app already uses, falling back to the vector icon when there's
// no image or the image fails to load (issue #24).
export default function ResourceImage({
  imageUrl,
  resourceType,
  iconPath,
  color = "#15803d",
  w = 52,
  h = 64,
  radius = 7,
}) {
  const [failed, setFailed] = useState(false);
  const path = iconPath || ICON[resourceType] || BOOK_ICON;
  const showImg = imageUrl && !failed;
  // Glyph sizing uses the numeric height (width may be a string like "100%").
  const glyph = Math.round((typeof h === "number" ? h : 56) * 0.42);

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: color,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImg ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {path
            .split("M")
            .filter(Boolean)
            .map((d, j) => (
              <path key={j} d={"M" + d} />
            ))}
        </svg>
      )}
    </div>
  );
}
