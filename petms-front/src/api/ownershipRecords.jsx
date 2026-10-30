import api from "./axios";
export const ownershipHistory = (pet) =>
  api.get(`/api/v1/pets/${pet}/ownerships`).then((r) => r.data);
export const transferOwnership = (pet, values) =>
  api.post(`/api/v1/pets/${pet}/transfer`, values).then((r) => r.data);
