import api from "./axios";
export const listOwners = (params, signal) =>
  api.get("/api/v1/owners", { params, signal }).then((r) => r.data);
export const saveOwner = (id, values) =>
  (id
    ? api.patch(`/api/v1/owners/${id}`, values)
    : api.post("/api/v1/owners", values)
  ).then((r) => r.data);
export const linkOwner = (id, values) =>
  api.post(`/api/v1/owners/${id}/link`, values).then((r) => r.data);
