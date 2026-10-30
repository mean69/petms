import api from "./axios";
export const saveAllergy = (pet, id, values) =>
  (id
    ? api.patch(`/api/v1/pets/${pet}/allergies/${id}`, values)
    : api.post(`/api/v1/pets/${pet}/allergies`, values)
  ).then((r) => r.data);
export const setAllergyStatus = (pet, status) =>
  api.patch(`/api/v1/pets/${pet}/allergy-status`, {
    allergy_information_status: status,
  });
