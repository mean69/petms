import api from "./axios";
export const listPets = (params, signal) =>
  api.get("/api/v1/pets", { params, signal }).then((r) => r.data);
export const getPet = (id, signal) =>
  api.get(`/api/v1/pets/${id}`, { signal }).then((r) => r.data);
export const savePet = (id, values) =>
  (id
    ? api.patch(`/api/v1/pets/${id}`, values)
    : api.post("/api/v1/pets", values)
  ).then((r) => r.data);
export const archivePet = (id, archived) =>
  api.post(`/api/v1/pets/${id}/${archived ? "restore" : "archive"}`);
export const references = (signal) =>
  api.get("/api/v1/references", { signal }).then((r) => r.data);
