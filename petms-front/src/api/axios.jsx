import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  withCredentials: true,
  withXSRFToken: true,
  timeout: 30000,
});

export function errorMessage(error) {
  if (error.response?.data?.errors)
    return Object.values(error.response.data.errors).flat().join(" ");
  if (!error.response)
    return "Unable to reach PetFave. Check your connection and that the API is running.";
  const messages = {
    401: "Please sign in to continue.",
    403: "Your account cannot perform this action.",
    419: "Your session expired. Please sign in again.",
    429: "Too many attempts. Please wait and try again.",
  };
  return (
    error.response.data.message ||
    messages[error.response.status] ||
    "Something went wrong. Please try again."
  );
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 419].includes(error.response?.status))
      window.dispatchEvent(
        new CustomEvent("petfave:session", { detail: error.response.status }),
      );
    return Promise.reject(error);
  },
);

export default api;
