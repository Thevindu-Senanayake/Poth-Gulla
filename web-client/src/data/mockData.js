export const BOOK_ICON = "M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z";
export const DEVICE_ICON = "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM2 18h20";
export const ROOM_ICON = "M3 3h18v18H3zM9 3v18M15 9H3M15 15H3";

export const resources = [
  { id:1, title:"Clean Code", author:"Robert C. Martin", cat:"Programming", type:"book", copies:4, available:2, color:"#15803d", iconPath:BOOK_ICON, tags:["Software","Best Practices"], blurb:"A handbook of agile software craftsmanship. Learn to write clean, readable, maintainable code that stands the test of time.", tier:null },
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas", cat:"Programming", type:"book", copies:3, available:0, color:"#7c3aed", iconPath:BOOK_ICON, tags:["Software","Career"], blurb:"From journeyman to master — classic advice for software developers on building better software and careers.", tier:null },
  { id:3, title:"Designing Data-Intensive Apps", author:"Martin Kleppmann", cat:"Systems", type:"book", copies:2, available:0, color:"#0e7490", iconPath:BOOK_ICON, tags:["Systems","Databases"], blurb:"The big ideas behind reliable, scalable, and maintainable applications — databases, distributed systems, and data processing pipelines.", tier:null },
  { id:4, title:"MacBook Air M3", author:"Apple · 2024", cat:"Computing", type:"device", copies:5, available:2, color:"#374151", iconPath:DEVICE_ICON, tags:["Computing","Portable"], blurb:"16GB RAM, 512GB SSD. For intensive development, video editing, and machine-learning coursework.", tier:4 },
  { id:5, title:"iPad Pro 13\"", author:"Apple · 2024", cat:"Tablet", type:"device", copies:8, available:5, color:"#1d4ed8", iconPath:DEVICE_ICON, tags:["Tablet","Drawing"], blurb:"M4 chip, 256GB. Ideal for digital annotation, research reading, and design work.", tier:2 },
  { id:6, title:"Group Study Room A1", author:"Capacity: 8 · Whiteboard + Screen", cat:"Study Room", type:"room", copies:1, available:1, color:"#b45309", iconPath:ROOM_ICON, tags:["Group Study","Whiteboard"], blurb:"Large group room with 4K display, whiteboard and video-conferencing setup. Perfect for presentations and project meetings.", tier:null },
  { id:7, title:"Quiet Study Pod B3", author:"Capacity: 2 · Standing desk", cat:"Study Room", type:"room", copies:1, available:1, color:"#0f766e", iconPath:ROOM_ICON, tags:["Quiet","Focus"], blurb:"Soundproofed 2-person booth with height-adjustable desk. Book 30-min slots for intense focus sessions.", tier:null },
  { id:8, title:"Refactoring", author:"Martin Fowler", cat:"Programming", type:"book", copies:3, available:3, color:"#9f1239", iconPath:BOOK_ICON, tags:["Software","Design Patterns"], blurb:"Improving the design of existing code — a catalog of refactoring techniques with clear step-by-step instructions.", tier:null },
  { id:9, title:"Sony WH-1000XM5", author:"Sony · Noise Cancelling", cat:"Audio", type:"device", copies:10, available:7, color:"#292524", iconPath:DEVICE_ICON, tags:["Audio","Focus"], blurb:"Industry-leading noise cancellation with 30 hours battery. Great for deep focus in noisy environments.", tier:1 },
];

export const users = [
  { id:1, name:"Sahan Wickrama", email:"sahan@meridian.edu", role:"Student", tier:"Tier 3", pts:720, status:"Active", color:"#f59e0b", group:"CS · Batch 23", phone:"+94 77 123 4567" },
  { id:2, name:"Kavya Rajapaksa", email:"kavya@meridian.edu", role:"Student", tier:"Tier 2", pts:310, status:"Active", color:"#7c3aed", group:"IT · Batch 24", phone:"+94 71 234 5678" },
  { id:3, name:"Dr. Nimal Perera", email:"nimal.p@meridian.edu", role:"Lecturer", tier:"Tier 5", pts:2840, status:"Active", color:"#0e7490", group:"CS Department", phone:"+94 76 345 6789" },
  { id:4, name:"Amali Silva", email:"amali@meridian.edu", role:"Staff", tier:"—", pts:0, status:"Active", color:"#15803d", group:"Library", phone:"+94 77 456 7890" },
  { id:5, name:"Chamara Admin", email:"admin@meridian.edu", role:"Admin", tier:"—", pts:0, status:"Active", color:"#dc2626", group:"Administration", phone:"+94 71 567 8901" },
  { id:6, name:"Thilini Fernando", email:"thilini@meridian.edu", role:"Student", tier:"Tier 4", pts:1200, status:"Suspended", color:"#db2777", group:"ENG · Batch 22", phone:"+94 76 678 9012" },
  { id:7, name:"Roshan Gunaratne", email:"roshan@meridian.edu", role:"Student", tier:"Tier 1", pts:80, status:"Active", color:"#6d28d9", group:"BUS · Batch 25", phone:"+94 77 789 0123" },
  { id:8, name:"Prof. Dilani Mendis", email:"dilani.m@meridian.edu", role:"Lecturer", tier:"Tier 5", pts:3100, status:"Active", color:"#b45309", group:"IT Department", phone:"+94 71 890 1234" },
];

export const auditLogs = [
  { id:1, actor:"admin@meridian.edu", action:"User suspended", target:"Thilini Fernando (thilini@meridian.edu)", kind:"Admin", time:"2026-06-22 14:32", ip:"10.0.1.12", col:"#ef4444" },
  { id:2, actor:"amali@meridian.edu", action:"Checkout processed", target:"Clean Code · Sahan Wickrama", kind:"Checkout", time:"2026-06-22 13:18", ip:"10.0.1.8", col:"#16a34a" },
  { id:3, actor:"amali@meridian.edu", action:"Return processed", target:"The Pragmatic Programmer · Kavya Rajapaksa", kind:"Return", time:"2026-06-22 12:44", ip:"10.0.1.8", col:"#059669" },
  { id:4, actor:"system", action:"Overdue penalty applied", target:"Thilini Fernando · iPad Pro 13\" (−30 pts)", kind:"Penalty", time:"2026-06-22 00:00", ip:"system", col:"#f59e0b" },
  { id:5, actor:"admin@meridian.edu", action:"Config updated", target:"Tier 3 threshold changed 500→600", kind:"Config", time:"2026-06-21 17:03", ip:"10.0.1.12", col:"#8b5cf6" },
  { id:6, actor:"sahan@meridian.edu", action:"Waitlist joined", target:"Designing Data-Intensive Apps · position #2", kind:"Waitlist", time:"2026-06-21 10:45", ip:"10.0.2.44", col:"#db2777" },
  { id:7, actor:"amali@meridian.edu", action:"Resource added", target:"Sony WH-1000XM5 · qty 10", kind:"Resource", time:"2026-06-20 09:12", ip:"10.0.1.8", col:"#0e7490" },
];

// Mirrors the backend's TIER_FLOORS + TIER_LIMITS (server/src/common/domain.constants.ts).
export const configTiers = [
  { tier:"Tier 1", label:"Restricted", col:"#ef4444", threshold:0, books:1, devices:1, rooms:1 },
  { tier:"Tier 2", label:"Basic", col:"#d97706", threshold:200, books:2, devices:1, rooms:1 },
  { tier:"Tier 3", label:"Regular", col:"#16a34a", threshold:500, books:3, devices:2, rooms:1 },
  { tier:"Tier 4", label:"Trusted", col:"#3b82f6", threshold:1000, books:4, devices:3, rooms:2 },
  { tier:"Tier 5", label:"Elite", col:"#8b5cf6", threshold:2000, books:5, devices:3, rooms:2 },
];

// Mirrors POINT_DELTA (server/src/points/point-events.ts) + overdue escalation days.
export const configPenalties = [
  { rule:"Book returned on time", value:"+25" },
  { rule:"Book returned early (3+ days)", value:"+50" },
  { rule:"Book late (per day, days 2–7)", value:"−20/day" },
  { rule:"Device returned on time / early", value:"+30 / +40" },
  { rule:"Device returned damaged", value:"−300" },
  { rule:"Room attended (QR check-in)", value:"+20" },
  { rule:"Room no-show", value:"−150" },
  { rule:"Approved booking cancelled", value:"−25" },
  { rule:"Recall flag set (days overdue)", value:"2" },
  { rule:"Escalate to admin (days overdue)", value:"7" },
];

export const configToggles = [
  { label:"Waitlist justification messages", on:true },
  { label:"Collaborative recommendations (Redis-cached)", on:true },
  { label:"QR-based checkout / return", on:true },
  { label:"Overdue sweep job", on:true },
  { label:"Tier 4–5 device approval required", on:true },
  { label:"Faculty (lecturer) priority weighting", on:true },
];

export const pointEvents = [
  { action:"Book returned on time", delta:"+20", positive:true },
  { action:"Study room checked in on time", delta:"+20", positive:true },
  { action:"Review submitted", delta:"+5", positive:true },
  { action:"Early return (3+ days)", delta:"+10", positive:true },
  { action:"Overdue per day", delta:"−5", positive:false },
  { action:"No-show for booking", delta:"−20", positive:false },
  { action:"Item lost / damaged", delta:"−100", positive:false },
];

export const pointHistory = [
  { action:"Returned Clean Code on time", date:"Jun 20, 2026", delta:"+20", positive:true },
  { action:"Study room A1 checked in", date:"Jun 18, 2026", delta:"+20", positive:true },
  { action:"Submitted review for Refactoring", date:"Jun 15, 2026", delta:"+5", positive:true },
  { action:"Overdue: iPad Pro (3 days)", date:"Jun 10, 2026", delta:"−15", positive:false },
  { action:"Returned The Pragmatic Programmer", date:"Jun 5, 2026", delta:"+20", positive:true },
];

export const roles = {
  student: {
    name: "Sahan Wickrama", email: "sahan@meridian.edu", initials:"SW", avatarBg:"#f59e0b",
    tierLabel:"Tier 3 · Regular", points:720, nextTierAt:1000, nextTierLabel:"Tier 4", toNextTier:280,
    progressPct:"72%", activeLoans:3, role:"student", roleLabel:"Student"
  },
  lecturer: {
    name: "Dr. Nimal Perera", email: "nimal.p@meridian.edu", initials:"NP", avatarBg:"#0e7490",
    tierLabel:"Tier 5 · Luminary", points:2840, nextTierAt:3000, nextTierLabel:"Max", toNextTier:160,
    progressPct:"95%", activeLoans:2, role:"lecturer", roleLabel:"Lecturer"
  },
  staff: {
    name: "Amali Silva", email: "amali@meridian.edu", initials:"AS", avatarBg:"#15803d",
    role:"staff", roleLabel:"Library Staff"
  },
  admin: {
    name: "Chamara Admin", email: "admin@meridian.edu", initials:"CA", avatarBg:"#dc2626",
    role:"admin", roleLabel:"Administrator"
  },
};

export const overdueList = [
  { id:1, user:"Thilini Fernando", initials:"TF", color:"#db2777", role:"Student", group:"ENG · Batch 22", item:"iPad Pro 13\"", email:"thilini@meridian.edu", phone:"+94 76 678 9012", penalty:"−45 pts", days:"9 days", stage:"Staff recall", bg:"#fee2e2", col:"#ef4444" },
  { id:2, user:"Roshan Gunaratne", initials:"RG", color:"#6d28d9", role:"Student", group:"BUS · Batch 25", item:"Clean Code", email:"roshan@meridian.edu", phone:"+94 77 789 0123", penalty:"−15 pts", days:"3 days", stage:"Reminder sent", bg:"#fef2e2", col:"#f59e0b" },
  { id:3, user:"Kavya Rajapaksa", initials:"KR", color:"#7c3aed", role:"Student", group:"IT · Batch 24", item:"The Pragmatic Programmer", email:"kavya@meridian.edu", phone:"+94 71 234 5678", penalty:"−10 pts", days:"2 days", stage:"Grace period", bg:"#fef9e2", col:"#d97706" },
  { id:4, user:"Dr. Nimal Perera", initials:"NP", color:"#0e7490", role:"Lecturer", group:"CS Department", item:"Designing Data-Intensive Apps", email:"nimal.p@meridian.edu", phone:"+94 76 345 6789", penalty:"−5 pts", days:"1 day", stage:"Grace period", bg:"#fef9e2", col:"#d97706" },
];

export const deskFeed = [
  { action:"Checked out", item:"Clean Code → Sahan W.", time:"2 min ago", col:"#16a34a", iconPath:"M9 3h6v13H9zM5 20h14", bg:"#dcfce7" },
  { action:"Returned", item:"Pragmatic Programmer", time:"15 min ago", col:"#059669", iconPath:"M5 12l4 4L19 6", bg:"#d7f8e9" },
  { action:"Approved", item:"MacBook Air M3 · Thilini F.", time:"34 min ago", col:"#3b82f6", iconPath:"M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z", bg:"#dbeafe" },
  { action:"Waitlist promoted", item:"Designing Data Apps → #1", time:"1 hr ago", col:"#db2777", iconPath:"M4 7h16M4 12h16M4 17h10", bg:"#fce7f3" },
  { action:"Returned", item:"iPad Pro 13\"", time:"2 hr ago", col:"#059669", iconPath:"M5 12l4 4L19 6", bg:"#d7f8e9" },
];

export const waitlistReview = {
  flagged: [
    { id:1, user:"Sahan Wickrama", initials:"SW", color:"#f59e0b", role:"Student", tier:3, resource:"Designing Data-Intensive Apps", score:"7.2", message:"I need this book urgently for my final year project which is due in 2 weeks. I will return it within 5 days.", done:false, doneLabel:"", doneBg:"", doneCol:"" },
    { id:2, user:"Dr. Nimal Perera", initials:"NP", color:"#0e7490", role:"Lecturer", tier:5, resource:"Clean Code", score:"9.4", message:"Required for the upcoming software engineering module I am teaching. I need 3 copies but only requesting 1 here.", done:false, doneLabel:"", doneBg:"", doneCol:"" },
  ],
  auto: [
    { id:3, user:"Kavya Rajapaksa", initials:"KR", color:"#7c3aed", role:"Student", tier:2, resource:"Designing Data-Intensive Apps", score:"5.6" },
    { id:4, user:"Roshan Gunaratne", initials:"RG", color:"#6d28d9", role:"Student", tier:1, resource:"Designing Data-Intensive Apps", score:"4.2" },
  ]
};

export const approvalsList = [
  { id:1, user:"Thilini Fernando", initials:"TF", color:"#db2777", sub:"ENG · Batch 22 · Tier 4", device:"MacBook Air M3", when:"Jun 24 – Jul 1, 2026", tier:4, done:false },
  { id:2, user:"Sahan Wickrama", initials:"SW", color:"#f59e0b", sub:"CS · Batch 23 · Tier 3 → 4 (pending)", device:"MacBook Air M3", when:"Jun 25 – Jun 28, 2026", tier:4, done:false },
];

export const adminStats = [
  { label:"Total members", value:"2,847", trend:"+12 this week", trendColor:"#16a34a", iconBg:"#dcfce7", iconColor:"#16a34a", iconPath:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" },
  { label:"Active bookings", value:"486", trend:"+8 today", trendColor:"#16a34a", iconBg:"#d7f8e9", iconColor:"#059669", iconPath:"M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" },
  { label:"Overdue items", value:"23", trend:"4 escalated", trendColor:"#ef4444", iconBg:"#fee2e2", iconColor:"#ef4444", iconPath:"M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" },
  { label:"Resources", value:"14,302", trend:"7 added today", trendColor:"#3b82f6", iconBg:"#dbeafe", iconColor:"#3b82f6", iconPath:"M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z" },
];

export const adminBars = [
  { label:"Mon", h:"60%" }, { label:"Tue", h:"85%" }, { label:"Wed", h:"72%" },
  { label:"Thu", h:"90%" }, { label:"Fri", h:"110px" }, { label:"Sat", h:"45%" }, { label:"Sun", h:"30%" },
];

export const adminTierDist = [
  { tier:"Tier 5 · Luminary", pct:"4%", w:"4%", col:"#8b5cf6" },
  { tier:"Tier 4 · Scholar", pct:"12%", w:"12%", col:"#3b82f6" },
  { tier:"Tier 3 · Regular", pct:"31%", w:"31%", col:"#f59e0b" },
  { tier:"Tier 2 · Reader", pct:"38%", w:"38%", col:"#22c55e" },
  { tier:"Tier 1 · Newcomer", pct:"15%", w:"15%", col:"#9b9db2" },
];

export const adminHealth = [
  { label:"API", status:"Operational", dot:"#22c55e", col:"#16a34a" },
  { label:"Database", status:"Operational", dot:"#22c55e", col:"#16a34a" },
  { label:"QR Service", status:"Operational", dot:"#22c55e", col:"#16a34a" },
  { label:"Email", status:"Degraded", dot:"#f59e0b", col:"#d97706" },
  { label:"Backup", status:"Operational", dot:"#22c55e", col:"#16a34a" },
];

export const staffStats = [
  { label:"Checked out today", value:"48", trend:"+6 vs avg", trendColor:"#16a34a", iconBg:"#dcfce7", iconColor:"#16a34a", iconPath:"M9 3h6v13H9zM5 20h14" },
  { label:"Returns today", value:"32", trend:"On track", trendColor:"#059669", iconBg:"#d7f8e9", iconColor:"#059669", iconPath:"M5 12l4 4L19 6" },
  { label:"Waitlist flagged", value:"2", trend:"Needs review", trendColor:"#f59e0b", iconBg:"#fef2e2", iconColor:"#d97706", iconPath:"M4 5h16v11H7l-3 3z" },
  { label:"Overdue items", value:"23", trend:"4 escalated", trendColor:"#ef4444", iconBg:"#fee2e2", iconColor:"#ef4444", iconPath:"M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" },
];

export const dashStats = [
  { label:"Active loans", value:"3", trend:"2 due soon", trendColor:"#f59e0b", iconBg:"#dcfce7", iconColor:"#16a34a", iconPath:"M5 4a1 1 0 0 1 1-1h11v15H6a1 1 0 0 0-1 1z" },
  { label:"Points this month", value:"+65", trend:"↑ great month", trendColor:"#16a34a", iconBg:"#fef4e6", iconColor:"#f59e0b", iconPath:"M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" },
  { label:"Waitlist position", value:"#2", trend:"Flagged", trendColor:"#db2777", iconBg:"#fce7f3", iconColor:"#db2777", iconPath:"M4 7h16M4 12h16M4 17h10" },
  { label:"Rooms booked", value:"1", trend:"Tomorrow 2–4 PM", trendColor:"#3b82f6", iconBg:"#dbeafe", iconColor:"#3b82f6", iconPath:"M3 3h18v18H3zM9 3v18" },
];

export const adminBookResources = [
  { id:1, title:"Clean Code", author:"Robert C. Martin", cat:"Book", color:"#15803d", copies:[
    { id:"CC-001", status:"available" }, { id:"CC-002", status:"on_loan" }, { id:"CC-003", status:"on_loan" }, { id:"CC-004", status:"maintenance" }
  ]},
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas", cat:"Book", color:"#7c3aed", copies:[
    { id:"PP-001", status:"on_loan" }, { id:"PP-002", status:"on_loan" }, { id:"PP-003", status:"available" }
  ]},
  { id:3, title:"Designing Data-Intensive Apps", author:"Martin Kleppmann", cat:"Book", color:"#0e7490", copies:[
    { id:"DDA-001", status:"on_loan" }, { id:"DDA-002", status:"on_loan" }
  ]},
  { id:4, title:"MacBook Air M3", author:"Apple · 2024", cat:"Device", color:"#374151", copies:[
    { id:"MBA-001", status:"available" }, { id:"MBA-002", status:"on_loan" }, { id:"MBA-003", status:"on_loan" }, { id:"MBA-004", status:"on_loan" }, { id:"MBA-005", status:"maintenance" }
  ]},
  { id:5, title:"iPad Pro 13\"", author:"Apple · 2024", cat:"Device", color:"#1d4ed8", copies:[
    { id:"IPD-001", status:"available" }, { id:"IPD-002", status:"available" }, { id:"IPD-003", status:"on_loan" }, { id:"IPD-004", status:"available" }, { id:"IPD-005", status:"available" }
  ]},
  { id:6, title:"Refactoring", author:"Martin Fowler", cat:"Book", color:"#9f1239", copies:[
    { id:"REF-001", status:"available" }, { id:"REF-002", status:"available" }, { id:"REF-003", status:"available" }
  ]},
];

export const recCollab = [
  { title:"Software Engineering at Google", author:"Winters, Manshreck & Wright", reason:"Borrowed by 8 students who also borrowed Clean Code and The Pragmatic Programmer.", score:"97% match", color:"#15803d" },
  { title:"A Philosophy of Software Design", author:"John Ousterhout", reason:"Highly correlated with your borrowing pattern — 6 of 7 overlap students borrowed this within 30 days.", score:"94% match", color:"#0e7490" },
];

export const recContent = [
  { title:"Staff Engineer", author:"Will Larson", reason:"Matches your interest in software quality and engineering career progression.", score:"New", color:"#7c3aed" },
  { title:"The Manager's Path", author:"Camille Fournier", reason:"Recent addition. Related to software engineering teams and career progression themes.", score:"New", color:"#b45309" },
];

export const recPopular = [
  { title:"Atomic Habits", author:"James Clear", reason:"132 borrows this semester", score:"#1 this term", color:"#db2777" },
];

export const tiers = [
  { tier:"Tier 1", label:"Newcomer", col:"#9b9db2", range:"0 – 199 pts", cur:"transparent", curBorder:"#eeeef4" },
  { tier:"Tier 2", label:"Reader", col:"#22c55e", range:"200 – 599 pts", cur:"transparent", curBorder:"#eeeef4" },
  { tier:"Tier 3", label:"Regular", col:"#f59e0b", range:"600 – 999 pts", cur:"#fef4e6", curBorder:"#f8dcae" },
  { tier:"Tier 4", label:"Scholar", col:"#3b82f6", range:"1,000 – 1,999 pts", cur:"transparent", curBorder:"#eeeef4" },
  { tier:"Tier 5", label:"Luminary", col:"#8b5cf6", range:"2,000+ pts", cur:"transparent", curBorder:"#eeeef4" },
];

export const currentLoans = [
  { id:1, title:"Clean Code", meta:"Robert C. Martin · Book", color:"#15803d", iconPath:BOOK_ICON, due:"Jun 28", dueColor:"#16a34a", daysLeft:"6 days left", picked:"Jun 14" },
  { id:2, title:"MacBook Air M3", meta:"Apple · Device", color:"#374151", iconPath:DEVICE_ICON, due:"Jun 25", dueColor:"#f59e0b", daysLeft:"3 days left", picked:"Jun 18" },
  { id:3, title:"Group Study Room A1", meta:"Jun 24 · 2:00–4:00 PM", color:"#b45309", iconPath:ROOM_ICON, due:"Jun 24", dueColor:"#16a34a", daysLeft:"Today", picked:"Jun 22" },
];

export const mbUpcoming = [
  { title:"The Pragmatic Programmer", meta:"Robert C. Martin", color:"#7c3aed", iconPath:BOOK_ICON, when:"Jul 2 – Jul 16", status:"Ready for pickup", statusBg:"#d7f8e9", statusCol:"#059669" },
  { title:"Quiet Study Pod B3", meta:"Capacity: 2", color:"#0f766e", iconPath:ROOM_ICON, when:"Jun 26 · 10–11 AM", status:"Confirmed", statusBg:"#dbeafe", statusCol:"#1d4ed8" },
];

export const mbHistory = [
  { title:"Refactoring", meta:"Martin Fowler · Book", date:"Jun 10", color:"#9f1239", iconPath:BOOK_ICON, points:"+20", neg:"#16a34a" },
  { title:"iPad Pro 13\"", meta:"Apple · Device", date:"Jun 5", color:"#1d4ed8", iconPath:DEVICE_ICON, points:"−15", neg:"#ef4444" },
  { title:"Clean Code", meta:"Robert C. Martin", date:"May 28", color:"#15803d", iconPath:BOOK_ICON, points:"+20", neg:"#16a34a" },
  { title:"Group Room A2", meta:"Study Room", date:"May 22", color:"#b45309", iconPath:ROOM_ICON, points:"+20", neg:"#16a34a" },
];

export const wlEntries = [
  { position:2, title:"Designing Data-Intensive Apps", author:"Martin Kleppmann", priorityScore:"7.2", hasMessage:true, message:"I need this book urgently for my final year project which is due in 2 weeks. I will return it within 5 days.", statusCol:"#f59e0b", status:"Flagged — staff will review your message" },
];

export const roomRows = [
  { name:"Study Room A1", meta:"Cap: 8 · Screen + WB", slots:[
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#16a34a",bd:"#16a34a",fg:"#fff",t:"You"},
    {bg:"#16a34a",bd:"#16a34a",fg:"#fff",t:"You"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
  ]},
  { name:"Study Room A2", meta:"Cap: 6 · Screen", slots:[
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
  ]},
  { name:"Pod B3", meta:"Cap: 2 · Standing desk", slots:[
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
  ]},
  { name:"Pod C1", meta:"Cap: 4 · Quiet zone", slots:[
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#f0f0f6",bd:"#e7e7ef",fg:"#9b9db2",t:"Booked"},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
    {bg:"#e3f8ee",bd:"#b6f0d3",fg:"#059669",t:""},
  ]},
];

export const manageList = [
  { id:1, title:"Clean Code", author:"Robert C. Martin", color:"#15803d", iconPath:BOOK_ICON, typeLabel:"Book", copies:"4 copies", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:2, title:"The Pragmatic Programmer", author:"Hunt & Thomas", color:"#7c3aed", iconPath:BOOK_ICON, typeLabel:"Book", copies:"3 copies", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:3, title:"Designing Data-Intensive Apps", author:"Martin Kleppmann", color:"#0e7490", iconPath:BOOK_ICON, typeLabel:"Book", copies:"2 copies", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:4, title:"MacBook Air M3", author:"Apple · 2024", color:"#374151", iconPath:DEVICE_ICON, typeLabel:"Device", copies:"5 copies", statusKey:"maintenance", statusCol:"#d97706", statusBg:"#fef2e2" },
  { id:5, title:"iPad Pro 13\"", author:"Apple · 2024", color:"#1d4ed8", iconPath:DEVICE_ICON, typeLabel:"Device", copies:"8 copies", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:6, title:"Group Study Room A1", author:"Cap: 8", color:"#b45309", iconPath:ROOM_ICON, typeLabel:"Study Room", copies:"1", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:7, title:"Sony WH-1000XM5", author:"Sony · Audio", color:"#292524", iconPath:DEVICE_ICON, typeLabel:"Device", copies:"10 copies", statusKey:"available", statusCol:"#16a34a", statusBg:"#dcfce7" },
  { id:8, title:"Refactoring", author:"Martin Fowler", color:"#9f1239", iconPath:BOOK_ICON, typeLabel:"Book", copies:"3 copies", statusKey:"unavailable", statusCol:"#ef4444", statusBg:"#fee2e2" },
];

export const profileStats = [
  { value:"42", label:"Total borrowed" },
  { value:"18", label:"Reviews written" },
  { value:"96%", label:"On-time rate" },
];

// QR code pattern generator (simple deterministic pattern)
export function generateQRCells(seed = 42) {
  const size = 11;
  const cells = [];
  const pattern = [
    1,1,1,1,1,1,1,0,1,0,1,
    1,0,0,0,0,0,1,0,0,1,1,
    1,0,1,1,1,0,1,0,1,0,0,
    1,0,1,1,1,0,1,0,0,1,0,
    1,0,1,1,1,0,1,0,1,1,1,
    1,0,0,0,0,0,1,0,1,0,0,
    1,1,1,1,1,1,1,0,1,0,1,
    0,0,0,0,0,0,0,0,0,1,0,
    1,0,1,1,0,1,1,0,1,0,1,
    0,1,0,0,1,0,0,0,0,1,1,
    1,1,1,0,1,1,1,0,1,0,1,
  ];
  for (let i = 0; i < size * size; i++) {
    cells.push({ bg: pattern[i] ? "#0c2a1a" : "#ffffff" });
  }
  return cells;
}
