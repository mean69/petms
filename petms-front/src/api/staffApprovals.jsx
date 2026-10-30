import api from "./axios";
export const listUsers = (page = 1, signal) =>
  api.get("/api/v1/users", { params: { page }, signal }).then((r) => r.data);
export const updateUser = (id, values) =>
  api.patch(`/api/v1/users/${id}`, values).then((r) => r.data);
export const decideStaff = (id, values) =>
  api.post(`/api/v1/users/${id}/decision`, values).then((r) => r.data);
