import api from "./axios";
export const csrf = () => api.get("/sanctum/csrf-cookie");
let currentUserRequest = null;
export const currentUser = () => {
  if (!currentUserRequest)
    currentUserRequest = api
      .get("/api/v1/me")
      .then((r) => r.data.data ?? r.data)
      .finally(() => {
        currentUserRequest = null;
      });
  return currentUserRequest;
};
export const register = async (values) => {
  await csrf();
  const { data } = await api.post("/register", values);
  const account = data.data ?? data;
  return account.id && account.role ? account : currentUser();
};
export const logout = () => api.post("/logout");
export const completeProfile = (values) =>
  api.patch("/api/v1/profile", values).then((r) => r.data.data ?? r.data);
export const googleStart = async (role) => {
  await csrf();
  const { data } = await api.post("/auth/google/start", { role });
  window.location.assign(data.url);
};
