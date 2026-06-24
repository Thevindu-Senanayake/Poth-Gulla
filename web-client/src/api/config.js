import { api } from "./client";

// System Config (ADMIN). Tier thresholds & borrowing limits, penalty rules,
// feature toggles - persisted server-side (issue #23).
export const getSystemConfig = () => api.get("/config").then((r) => r.data);
export const saveSystemConfig = (data) =>
  api.put("/config", data).then((r) => r.data);
