import api from "./axios";
export const listCorrections = (page = 1, signal) =>
  api
    .get("/api/v1/corrections", { params: { page }, signal })
    .then((r) => r.data);
export const createCorrection = (values) =>
  api.post("/api/v1/corrections", values).then((r) => r.data);
export const resolveCorrection = (id, values) =>
  api.post(`/api/v1/corrections/${id}/resolve`, values).then((r) => r.data);
