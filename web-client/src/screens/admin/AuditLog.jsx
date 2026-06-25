import { useApp } from "../../App";
import { useFetch } from "../../hooks/useFetch";
import { auditLogs as fetchAuditLogs } from "../../api/misc";
import { colorFor } from "../../api/adapters";
import { Loading, ErrorState } from "../../components/States";

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

// Map a log entry to one of the filter categories. We look at both the
// targetType (which the backend sets) and the action string (which is more
// stable across modules), so each chip reliably catches its events.
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

export default function AuditLog() {
	const { auditFilter, setAuditFilter } = useApp();
	const { data, loading, error, reload } = useFetch(
		() => fetchAuditLogs({ limit: 100 }),
		[],
	);

	if (loading) return <Loading label="Loading audit log…" />;
	if (error) return <ErrorState error={error} onRetry={reload} />;

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

	const filtered =
		auditFilter === "All" || !auditFilter
			? auditLogs
			: auditLogs.filter((log) => log.kind === auditFilter);

	return (
		<div
			style={{
				padding: "30px 30px 40px",
				fontFamily: "'Public Sans', sans-serif",
				minHeight: "100%",
			}}
		>
			{/* Header */}
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

			{/* Info banner */}
			<div
				className="pg-card-banner"
				style={{
					background: "linear-gradient(120deg,#0c2a1a 0%,#14532d 100%)",
					borderRadius: 12,
					padding: "13px 18px",
					marginBottom: 20,
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<div
					style={{
						width: 30,
						height: 30,
						borderRadius: "50%",
						background: "rgba(255,255,255,0.12)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="rgba(255,255,255,0.9)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
				</div>
				<div>
					<span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
						Append-only log
					</span>
					<span
						style={{
							fontSize: 12,
							color: "rgba(255,255,255,0.65)",
							marginLeft: 8,
						}}
					>
						All actions are immutably recorded. No entry can be edited or
						deleted.
					</span>
				</div>
			</div>

			{/* Filter chips with per-category counts */}
			<div
				style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
			>
				{FILTER_CHIPS.map((chip) => {
					const active = (auditFilter || "All") === chip;
					return (
						<button
							key={chip}
							onClick={() => setAuditFilter(chip)}
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

			{/* Table */}
			<div
				className="pg-card"
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
						gridTemplateColumns: "7px 2fr 2fr 3fr 100px 160px",
						padding: "10px 20px 10px 10px",
						background: "#f8f8fc",
						borderBottom: "1px solid #e7e7ef",
						gap: 16,
						alignItems: "center",
					}}
				>
					<div />
					{[
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

				{filtered.length === 0 && (
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
				{filtered.map((log, i) => (
					<div
						key={log.id}
						style={{
							display: "grid",
							gridTemplateColumns: "7px 2fr 2fr 3fr 100px 160px",
							gap: 16,
							borderBottom:
								i < filtered.length - 1 ? "1px solid #f0f0f6" : "none",
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
								lineHeight: 1.4,
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
				))}
			</div>
		</div>
	);
}
