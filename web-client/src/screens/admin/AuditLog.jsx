import { useState } from "react";
import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { usePaginated } from "../../hooks/usePaginated";
import { auditLogs as fetchAuditLogs } from "../../api/misc";
import { colorFor } from "../../api/adapters";
import { Loading, ErrorState } from "../../components/States";
import Pagination from "../../components/Pagination";

const FILTER_CHIPS = [
	"All",
	"User",
	"Booking",
	"Borrowing",
	"Waitlist",
	"Device",
	"Book",
	"Config",
];

const DATE_PRESETS = [
	{ key: "all", label: "All time" },
	{ key: "today", label: "Today" },
	{ key: "7d", label: "Last 7 days" },
	{ key: "30d", label: "Last 30 days" },
	{ key: "custom", label: "Custom range" },
];

function categoryFor(action, targetType) {
	const a = (action || "").toUpperCase();
	const t = (targetType || "").toLowerCase();

	if (a.startsWith("USER_") || t === "user") return "User";
	if (a.startsWith("BOOKING_") || t === "booking") return "Booking";
	if (
		a === "ITEM_CHECKED_OUT" ||
		a === "ITEM_RETURNED" ||
		a === "ROOM_CHECKED_IN" ||
		t === "borrowing" ||
		t === "checkout"
	)
		return "Borrowing";
	if (a.startsWith("WAITLIST_") || t === "waitlistentry" || t === "waitlist")
		return "Waitlist";
	if (a.startsWith("DEVICE_") || t === "device") return "Device";
	if (a.startsWith("BOOK_") || t === "book" || t === "bookcopy") return "Book";
	if (a === "CONFIG_UPDATED" || t === "config") return "Config";
	return "Other";
}

function fmt(d) {
	try {
		return new Date(d).toLocaleString();
	} catch {
		return d;
	}
}

function getEventDescription(log) {
	const meta = log.metadata || {};
	const action = log.action || "";

	switch (action) {
		case "CONFIG_UPDATED": {
			if (meta.differences) {
				const parts = [];
				const diffs = meta.differences;
				if (diffs.tiers && diffs.tiers.length > 0) {
					diffs.tiers.forEach((t) => {
						const fieldChanges = [];
						Object.entries(t.changes).forEach(([field, val]) => {
							fieldChanges.push(`"${field}" from "${val.from}" to "${val.to}"`);
						});
						parts.push(`${t.tier} (${fieldChanges.join(", ")})`);
					});
				}
				if (diffs.penalties && diffs.penalties.length > 0) {
					diffs.penalties.forEach((p) => {
						parts.push(
							`penalty rule "${p.rule}" from "${p.from}" to "${p.to}"`,
						);
					});
				}
				if (diffs.toggles && diffs.toggles.length > 0) {
					diffs.toggles.forEach((t) => {
						parts.push(
							`toggle "${t.label}" from "${t.from ? "ON" : "OFF"}" to "${t.to ? "ON" : "OFF"}"`,
						);
					});
				}
				if (parts.length > 0) {
					return `Updated system configuration. Changed: ${parts.join("; ")}`;
				}
			}
			const keys = meta.patch ? Object.keys(meta.patch) : [];
			return keys.length > 0
				? `Updated system configuration. Changed keys: ${keys.join(", ")}`
				: "Updated system configuration.";
		}
		case "USER_REGISTERED":
			return `Registered new user: ${meta.name || "-"} (${meta.email || "-"}) as ${meta.role || "-"}`;
		case "USER_UPDATED":
			return `Updated user profile for ${meta.name || "-"} (${meta.email || "-"})`;
		case "USER_ENABLED":
			return `Enabled account of ${meta.name || "-"} (${meta.email || "-"})`;
		case "USER_DISABLED":
			return `Disabled account of ${meta.name || "-"} (${meta.email || "-"})`;
		case "BOOKING_CREATED":
			return `Created booking for ${meta.userName || "-"} (${meta.userEmail || "-"}): ${meta.resourceType || "-"} "${meta.resourceName || "-"}"`;
		case "BOOKING_APPROVED":
			return `Approved booking for ${meta.userName || "-"} (${meta.userEmail || "-"}): ${meta.resourceType || "-"} "${meta.resourceName || "-"}"`;
		case "BOOKING_REJECTED":
			return `Rejected booking for ${meta.userName || "-"} (${meta.userEmail || "-"}): ${meta.resourceType || "-"} "${meta.resourceName || "-"}"`;
		case "BOOKING_CANCELLED":
			return `Cancelled booking for ${meta.userName || "-"} (${meta.userEmail || "-"}): ${meta.resourceType || "-"} "${meta.resourceName || "-"}"${meta.adminOverride ? " (by Admin)" : ""}`;
		case "ITEM_CHECKED_OUT":
			return `Checked out ${meta.resourceType || "-"} "${meta.resourceName || "-"}" (Asset: ${meta.assetTag || "-"}) to ${meta.userName || "-"} (${meta.userEmail || "-"})`;
		case "ROOM_CHECKED_IN":
			return `Checked in to room "${meta.resourceName || "-"}" for ${meta.userName || "-"} (${meta.userEmail || "-"})`;
		case "ITEM_RETURNED":
			return `Returned ${meta.resourceType || "-"} "${meta.resourceName || "-"}" (Asset: ${meta.assetTag || "-"}) from ${meta.userName || "-"} (${meta.userEmail || "-"}) · Condition: ${meta.condition || "-"}`;
		case "WAITLIST_ENQUEUED":
			return `Enqueued ${meta.userName || "-"} (${meta.userEmail || "-"}) on waitlist for ${meta.resourceType || "-"} "${meta.resourceName || "-"}" (Score: ${meta.priorityScore || "-"})`;
		case "WAITLIST_PROMOTED":
			return `Promoted ${meta.userName || "-"} (${meta.userEmail || "-"}) from waitlist for ${meta.resourceType || "-"} "${meta.resourceName || "-"}"${meta.staffNotes ? ` · Notes: ${meta.staffNotes}` : ""}`;
		case "WAITLIST_DISMISSED":
			return `Dismissed ${meta.userName || "-"} (${meta.userEmail || "-"}) from waitlist for ${meta.resourceType || "-"} "${meta.resourceName || "-"}"${meta.staffNotes ? ` · Notes: ${meta.staffNotes}` : ""}`;
		default:
			return "Performed administrative action.";
	}
}

function startOfToday() {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

function rangeFor(preset, customFrom, customTo) {
	const now = Date.now();
	switch (preset) {
		case "today":
			return { from: startOfToday(), to: now };
		case "7d":
			return { from: now - 7 * 86400000, to: now };
		case "30d":
			return { from: now - 30 * 86400000, to: now };
		case "custom": {
			const from = customFrom ? new Date(customFrom).getTime() : 0;
			const to = customTo ? new Date(customTo).getTime() + 86400000 - 1 : now;
			return { from, to };
		}
		default:
			return null;
	}
}

async function copyToClipboard(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export default function AuditLog() {
	const { auditFilter, setAuditFilter, showToast } = useApp();
	const { data, loading, error, reload } = useFetch(
		() => fetchAuditLogs({ limit: 500 }),
		[],
	);

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(30);
	const [datePreset, setDatePreset] = useState("all");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");
	const [idQuery, setIdQuery] = useState("");

	const auditLogs = (data?.items || []).map((l) => {
		const category = categoryFor(l.action, l.targetType);
		return {
			id: l.id,
			action: (l.action || "").replace(/_/g, " "),
			actor: l.actor?.name ? `${l.actor.name} · ${l.actor.role}` : "System",
			target: [l.targetType, l.targetId && String(l.targetId).slice(0, 8)]
				.filter(Boolean)
				.join(" · "),
			kind: category,
			ts: l.createdAt ? new Date(l.createdAt).getTime() : 0,
			time: fmt(l.createdAt),
			ip: l.metadata?.ip || "-",
			col: colorFor(category || l.targetType || l.action || "x"),
			description: getEventDescription(l),
		};
	});

	const counts = FILTER_CHIPS.reduce((acc, chip) => {
		acc[chip] =
			chip === "All"
				? auditLogs.length
				: auditLogs.filter((l) => l.kind === chip).length;
		return acc;
	}, {});

	const range = rangeFor(datePreset, customFrom, customTo);
	const idQ = idQuery.trim().toLowerCase();

	let filtered = auditLogs;
	if (auditFilter && auditFilter !== "All")
		filtered = filtered.filter((l) => l.kind === auditFilter);
	if (range)
		filtered = filtered.filter((l) => l.ts >= range.from && l.ts <= range.to);
	if (idQ)
		filtered = filtered.filter((l) => String(l.id).toLowerCase().includes(idQ));

	const paged = usePaginated(filtered, page, pageSize);

	if (loading) return <Loading label="Loading audit log…" />;
	if (error) return <ErrorState error={error} onRetry={reload} />;

	async function copyId(id) {
		const ok = await copyToClipboard(String(id));
		showToast(ok ? `Copied ${String(id).slice(0, 8)}…` : "Could not copy");
	}

	// Six narrow columns + ID. The ID is included as the leftmost numeric
	// column because backend uses it as the canonical reference for tickets
	// and debug reports.
	const gridCols = "7px 170px 1.8fr 1.8fr 2.6fr 100px 150px";

	return (
		<div
			style={{
				padding: "30px 30px 40px",
				fontFamily: "'Public Sans', sans-serif",
				minHeight: "100%",
			}}
		>
			<div style={{ marginBottom: 18 }}>
				<h1
					style={{
						fontFamily: "'Spectral', serif",
						fontSize: 24,
						fontWeight: 700,
						color: "#1a1b2e",
						margin: "0 0 4px",
					}}
				>
					Audit Log
				</h1>
				<p style={{ fontSize: 13, color: "#7c7e93", margin: 0 }}>
					{auditLogs.length} entries · {filtered.length} shown
				</p>
			</div>

			<div
				style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
			>
				{FILTER_CHIPS.map((chip) => {
					const active = (auditFilter || "All") === chip;
					return (
						<button
							key={chip}
							onClick={() => {
								setAuditFilter(chip);
								setPage(1);
							}}
							style={{
								background: active ? "#16a34a" : "#fff",
								color: active ? "#fff" : "#3a3b4e",
								border: `1px solid ${active ? "#16a34a" : "#e7e7ef"}`,
								borderRadius: 20,
								padding: "5px 14px",
								fontSize: 12,
								fontWeight: 600,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
							}}
						>
							{chip}
							<span
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: 11,
									fontWeight: 700,
									background: active ? "rgba(255,255,255,0.22)" : "#f0f0f6",
									color: active ? "#fff" : "#7c7e93",
									borderRadius: 10,
									padding: "1px 7px",
								}}
							>
								{counts[chip] ?? 0}
							</span>
						</button>
					);
				})}
			</div>

			<div
				style={{
					display: "flex",
					gap: 10,
					marginBottom: 14,
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<span style={{ fontSize: 12, fontWeight: 700, color: "#7c7e93" }}>
					Date:
				</span>
				{DATE_PRESETS.map((p) => {
					const active = datePreset === p.key;
					return (
						<button
							key={p.key}
							onClick={() => {
								setDatePreset(p.key);
								setPage(1);
							}}
							style={{
								background: active ? "#0c2a1a" : "#fff",
								color: active ? "#fff" : "#3a3b4e",
								border: `1px solid ${active ? "#0c2a1a" : "#e7e7ef"}`,
								borderRadius: 8,
								padding: "5px 12px",
								fontSize: 12,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							{p.label}
						</button>
					);
				})}
				{datePreset === "custom" && (
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<input
							type="date"
							value={customFrom}
							onChange={(e) => {
								setCustomFrom(e.target.value);
								setPage(1);
							}}
							style={dateInput}
						/>
						<span style={{ fontSize: 12, color: "#7c7e93" }}>→</span>
						<input
							type="date"
							value={customTo}
							onChange={(e) => {
								setCustomTo(e.target.value);
								setPage(1);
							}}
							style={dateInput}
						/>
					</div>
				)}
			</div>

			{/* Look up by log id — paste the id from a bug report */}
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 20,
					alignItems: "center",
				}}
			>
				<span style={{ fontSize: 12, fontWeight: 700, color: "#7c7e93" }}>
					Log ID:
				</span>
				<input
					value={idQuery}
					onChange={(e) => {
						setIdQuery(e.target.value);
						setPage(1);
					}}
					placeholder="Paste a log id (full or first 8 chars)"
					style={{
						...dateInput,
						width: 320,
						fontFamily: "'IBM Plex Mono', monospace",
					}}
				/>
				{idQuery && (
					<button
						onClick={() => {
							setIdQuery("");
							setPage(1);
						}}
						style={{
							background: "#f0f0f6",
							border: "none",
							color: "#7c7e93",
							borderRadius: 6,
							padding: "5px 10px",
							fontSize: 11,
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						Clear
					</button>
				)}
			</div>

			<div
				style={{
					background: "#fff",
					border: "1px solid #e7e7ef",
					borderRadius: 14,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: gridCols,
						padding: "10px 20px 10px 10px",
						background: "#f8f8fc",
						borderBottom: "1px solid #e7e7ef",
						gap: 16,
						alignItems: "center",
					}}
				>
					<div />
					{[
						"Log ID",
						"Actor / Action",
						"Target",
						"Description",
						"Kind",
						"Timestamp · IP",
					].map((col) => (
						<span
							key={col}
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: "#9b9db2",
								textTransform: "uppercase",
								letterSpacing: 0.5,
							}}
						>
							{col}
						</span>
					))}
				</div>

				{paged.slice.length === 0 && (
					<div
						style={{
							padding: "40px 20px",
							textAlign: "center",
							color: "#9b9db2",
							fontSize: 13,
						}}
					>
						No entries for this filter.
					</div>
				)}
				{paged.slice.map((log, i) => {
					const idStr = String(log.id);
					const short = idStr.length > 12 ? idStr.slice(0, 8) + "…" : idStr;
					return (
						<div
							key={log.id}
							style={{
								display: "grid",
								gridTemplateColumns: gridCols,
								gap: 16,
								borderBottom:
									i < paged.slice.length - 1 ? "1px solid #f0f0f6" : "none",
								alignItems: "center",
							}}
						>
							<div
								style={{
									background: log.col,
									width: 7,
									alignSelf: "stretch",
									minHeight: 56,
								}}
							/>
							<div style={{ padding: "14px 0" }}>
								<button
									onClick={() => copyId(idStr)}
									title={`Copy log id\n${idStr}`}
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: 11,
										fontWeight: 700,
										color: "#16231b",
										background: "#f0f0f6",
										border: "1px solid #e7e7ef",
										borderRadius: 6,
										padding: "3px 8px",
										cursor: "pointer",
									}}
								>
									{short}
								</button>
							</div>
							<div style={{ padding: "14px 0" }}>
								<div
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: "#1a1b2e",
										marginBottom: 2,
									}}
								>
									{log.action}
								</div>
								<div
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: 11,
										color: "#9b9db2",
									}}
								>
									{log.actor}
								</div>
							</div>
							<div
								style={{
									padding: "14px 0",
									fontSize: 12,
									color: "#3a3b4e",
								}}
							>
								{log.target}
							</div>
							<div
								style={{
									padding: "14px 0",
									fontSize: 12,
									color: "#3a3b4e",
									lineHeight: 1.4,
								}}
							>
								{log.description}
							</div>
							<div style={{ padding: "14px 0" }}>
								<span
									style={{
										display: "inline-block",
										background: log.col + "18",
										color: log.col,
										border: `1px solid ${log.col}40`,
										borderRadius: 20,
										padding: "3px 10px",
										fontSize: 11,
										fontWeight: 700,
									}}
								>
									{log.kind}
								</span>
							</div>
							<div style={{ padding: "14px 20px 14px 0" }}>
								<div
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontSize: 11,
										color: "#3a3b4e",
										marginBottom: 2,
									}}
								>
									{log.time}
								</div>
								<div style={{ fontSize: 11, color: "#9b9db2" }}>{log.ip}</div>
							</div>
						</div>
					);
				})}

				<Pagination
					page={paged.page}
					pageSize={pageSize}
					total={paged.total}
					onPageChange={setPage}
					onPageSizeChange={(s) => {
						setPageSize(s);
						setPage(1);
					}}
					pageSizes={[10, 30, 50, 100]}
				/>
			</div>
		</div>
	);
}

const dateInput = {
	border: "1px solid #e7e7ef",
	borderRadius: 7,
	padding: "5px 8px",
	fontSize: 12,
	background: "#fff",
	fontFamily: "'IBM Plex Mono', monospace",
};
