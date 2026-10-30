import api from "./axios";
import { csrf, currentUser } from "./Auth";
export default async function login(values) {
  await csrf();
  const { data } = await api.post("/login", values);
  const account = data.data ?? data;
  return account.id && account.role ? account : currentUser();
}
