import api from "./axios";
export const saveWeight = (pet, id, values) =>
  (id
    ? api.patch(`/api/v1/pets/${pet}/weights/${id}`, values)
    : api.post(`/api/v1/pets/${pet}/weights`, values)
  ).then((r) => r.data);
