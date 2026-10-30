import api from "./axios";
export const listLogs = (params, signal) =>
  api.get("/api/v1/activity-logs", { params, signal }).then((r) => r.data);
