import { useCallback, useEffect, useState } from "react";
import { currentUser, logout as logoutRequest } from "../api/Auth";
import { errorMessage } from "../api/axios";
import { AuthContext } from "./auth";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const fetchUser = useCallback(async () => {
    try {
      setUser(await currentUser());
    } catch (error) {
      setUser(null);
      if (![401, 419].includes(error.response?.status))
        setStartupError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  const refresh = async () => {
    setLoading(true);
    setStartupError("");
    await fetchUser();
  };
  useEffect(() => {
    fetchUser();
    const expire = () => setUser(null);
    window.addEventListener("petfave:session", expire);
    return () => window.removeEventListener("petfave:session", expire);
  }, [fetchUser]);
  const logout = async () => {
    await logoutRequest();
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, startupError, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
