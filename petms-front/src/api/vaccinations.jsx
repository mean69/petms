import api from "./axios";
export const saveVaccination = (pet, id, values) =>
  (id
    ? api.patch(`/api/v1/pets/${pet}/vaccinations/${id}`, values)
    : api.post(`/api/v1/pets/${pet}/vaccinations`, values)
  ).then((r) => r.data);
