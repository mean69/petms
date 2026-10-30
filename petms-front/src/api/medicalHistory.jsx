import api from "./axios";
export const saveMedical = (pet, id, values) =>
  (id
    ? api.patch(`/api/v1/pets/${pet}/medical-history/${id}`, values)
    : api.post(`/api/v1/pets/${pet}/medical-history`, values)
  ).then((r) => r.data);
