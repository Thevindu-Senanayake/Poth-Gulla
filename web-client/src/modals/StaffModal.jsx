import { useEffect, useState } from "react";
import { useApp } from "../App";
import {
  createBook,
  addCopy,
  createDevice,
  createRoom,
  updateBook,
  updateDevice,
  updateRoom,
} from "../api/catalogue";

const TYPES = ["Book", "Device", "Study Room"];
const CATS_BOOK = [
  "Programming",
  "Systems",
  "Science",
  "History",
  "Literature",
  "Other",
];
const CATS_DEVICE = ["Computing", "Tablet", "Audio", "Peripherals", "Other"];
const CATS_ROOM = ["Study Room", "Pod", "Conference", "Other"];
const STATUSES = ["available", "on_loan", "maintenance"];

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e7e7ef",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#1a1b2e",
  fontFamily: "'Public Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  background: "#f8f8fc",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#7c7e93",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Map incoming staffModal.type / staffModal.editItem.type to the UI dropdown.
function typeFromProps(t) {
  if (t === "device") return "Device";
  if (t === "room") return "Study Room";
  return "Book";
}

export default function StaffModal() {
  const { staffModal, setStaffModal, showToast, refresh } = useApp();
  const editItem = staffModal.editItem || null;
  const isEdit = Boolean(editItem);

  const [type, setType] = useState(typeFromProps(staffModal.type));
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [cat, setCat] = useState("");
  const [copies, setCopies] = useState(1);
  const [devTier, setDevTier] = useState(1);
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState("available");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [busy, setBusy] = useState(false);

  // Prefill once when entering edit mode.
  useEffect(() => {
    if (!isEdit) return;
    setType(typeFromProps(editItem.type || staffModal.type));
    setTitle(editItem.title || "");
    setAuthor(editItem.author || "");
    setCat(editItem.cat || "");
    setCopies(editItem.capacity || 1);
    setDevTier(editItem.tier || 1);
    setSerial(editItem.serial || editItem.raw?.assetTag || "");
    setImageDataUrl(editItem.imageUrl || "");
    setImageName(editItem.imageUrl ? "current image" : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id]);

  function close() {
    setStaffModal((prev) => ({ ...prev, open: false, editItem: null }));
  }

  function slug(s) {
    return (s || "item")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 10);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showToast("Image must be PNG, JPG, or WEBP");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast("Image must be under 2 MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
    } catch {
      showToast("Could not read image");
    }
  }

  function clearImage() {
    setImageDataUrl("");
    setImageName("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showToast("Enter a title");
      return;
    }
    setBusy(true);
    try {
      const n = Math.max(1, parseInt(copies, 10) || 1);

      if (isEdit) {
        // ---- EDIT ----
        if (type === "Book") {
          await updateBook(editItem.id, {
            title: title.trim(),
            author: author.trim() || "Unknown",
            description: author.trim(),
            tags: cat ? [cat] : [],
            imageUrl: imageDataUrl || null,
          });
        } else if (type === "Device") {
          await updateDevice(editItem.id, {
            name: title.trim(),
            assetTag: serial.trim() || editItem.serial,
            deviceTier: devTier,
            imageUrl: imageDataUrl || null,
          });
        } else {
          await updateRoom(editItem.id, {
            name: title.trim(),
            capacity: n,
            features: cat ? [cat] : [],
          });
        }
        showToast(`“${title.trim()}” updated`);
      } else {
        // ---- CREATE ----
        if (type === "Book") {
          const created = await createBook({
            title: title.trim(),
            author: author.trim() || "Unknown",
            description: author.trim(),
            tags: cat ? [cat] : [],
            imageUrl: imageDataUrl || undefined,
          });
          const base = slug(title);
          for (let i = 1; i <= n; i++) {
            await addCopy(
              created.id,
              `${base}-${Date.now().toString().slice(-5)}-${i}`,
            );
          }
        } else if (type === "Device") {
          if (!serial.trim()) {
            showToast("Enter a serial number for the device");
            setBusy(false);
            return;
          }
          await createDevice({
            name: title.trim(),
            assetTag: serial.trim(),
            deviceTier: devTier,
            imageUrl: imageDataUrl || undefined,
          });
        } else {
          await createRoom({
            name: title.trim(),
            capacity: n,
            features: cat ? [cat] : [],
            roomQr: `ROOM-${slug(title)}-${Date.now().toString().slice(-5)}`,
          });
        }
        showToast(`“${title.trim()}” added to the catalogue`);
      }

      refresh();
      close();
    } catch (e) {
      showToast(
        e?.response?.data?.message ??
          (isEdit ? "Could not update resource" : "Could not add resource"),
      );
    } finally {
      setBusy(false);
    }
  }

  const catOptions =
    type === "Device"
      ? CATS_DEVICE
      : type === "Study Room"
        ? CATS_ROOM
        : CATS_BOOK;
  const authorLabel =
    type === "Book"
      ? "Author"
      : type === "Device"
        ? "Description / Model"
        : "Description";
  const copiesLabel = type === "Study Room" ? "Capacity" : "Number of copies";
  const showImageUpload = type === "Book" || type === "Device";
  const headerTitle = isEdit ? `Edit ${type.toLowerCase()}` : "Add resource";
  const submitLabel = busy
    ? isEdit
      ? "Saving…"
      : "Adding…"
    : isEdit
      ? "Save changes"
      : "Add to catalogue";

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,24,15,0.58)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          width: 480,
          maxWidth: "96vw",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(6,24,15,0.22)",
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f0f0f6",
          }}>
          <h2
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#1a1b2e",
              margin: 0,
              textTransform: "capitalize",
            }}>
            {headerTitle}
          </h2>
          <button
            onClick={close}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9b9db2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Type toggle — locked while editing because changing it would
              cross to a different backend resource entity. */}
          <Field label="Resource type">
            <div style={{ display: "flex", gap: 8 }}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    if (isEdit) return;
                    setType(t);
                    setCat("");
                    if (t === "Study Room") clearImage();
                  }}
                  disabled={isEdit && type !== t}
                  style={{
                    flex: 1,
                    background:
                      type === t ? "#16a34a" : isEdit ? "#f8f8fc" : "#f0f0f6",
                    color: type === t ? "#fff" : isEdit ? "#c4c5d4" : "#3a3b4e",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 8px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isEdit && type !== t ? "not-allowed" : "pointer",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Title">
            <input
              type="text"
              placeholder={
                type === "Book"
                  ? "Book title"
                  : type === "Device"
                    ? "Device name"
                    : "Room name"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label={authorLabel}>
            <input
              type="text"
              placeholder={
                type === "Book"
                  ? "Author name"
                  : type === "Device"
                    ? "e.g. Apple · M3 · 16GB"
                    : "e.g. Capacity: 8 · Whiteboard + Screen"
              }
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Category">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select category...</option>
              {catOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label={copiesLabel}>
            <input
              type="number"
              min="1"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              disabled={isEdit && type === "Book"}
              style={{
                ...inputStyle,
                width: "120px",
                opacity: isEdit && type === "Book" ? 0.6 : 1,
              }}
            />
            {isEdit && type === "Book" && (
              <div style={{ fontSize: 11, color: "#9b9db2", marginTop: 4 }}>
                Manage individual copies from “Manage copies” on the row.
              </div>
            )}
          </Field>

          {type === "Device" && (
            <Field label="Serial number">
              <input
                type="text"
                placeholder="e.g. DEV-MBP-014 / SN-2024-00123"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              />
            </Field>
          )}

          {type === "Device" && (
            <Field label="Device tier (1–5)">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDevTier(n)}
                    style={{
                      flex: 1,
                      background: devTier === n ? "#0c2a1a" : "#f0f0f6",
                      color: devTier === n ? "#fff" : "#3a3b4e",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}>
                    T{n}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {showImageUpload && (
            <Field label="Cover image (optional)">
              {imageDataUrl ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1.5px solid #e7e7ef",
                    borderRadius: 8,
                    padding: 10,
                    background: "#f8f8fc",
                  }}>
                  <img
                    src={imageDataUrl}
                    alt="preview"
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: "1px solid #e7e7ef",
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 12, color: "#3a3b4e" }}>
                    {imageName || "image"}
                  </div>
                  <button
                    onClick={clearImage}
                    style={{
                      background: "#fff",
                      color: "#ef4444",
                      border: "1px solid #fecaca",
                      borderRadius: 7,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}>
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "block",
                    border: "1.5px dashed #c4c5d4",
                    borderRadius: 8,
                    padding: "18px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f8f8fc",
                    color: "#7c7e93",
                    fontSize: 12,
                  }}>
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#3a3b4e",
                      marginBottom: 4,
                    }}>
                    Click to upload
                  </div>
                  <div>PNG, JPG, or WEBP · up to 2 MB</div>
                </label>
              )}
            </Field>
          )}

          {!isEdit && (
            <Field label="Initial status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "6px 24px 22px" }}>
          <button
            onClick={close}
            style={{
              flex: 1,
              background: "#f0f0f6",
              color: "#3a3b4e",
              border: "none",
              borderRadius: 9,
              padding: "11px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            style={{
              flex: 1,
              background: busy ? "#86efac" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              padding: "11px",
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
