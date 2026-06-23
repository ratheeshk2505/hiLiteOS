import { createContext, useContext, useEffect, useState } from 'react';
import { platformApi } from '../api/platformApi';
import { getErrorMessage } from '../api/apiClient';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'hilite_platform_access_token';
const REFRESH_TOKEN_KEY = 'hilite_platform_refresh_token';
const ADMIN_KEY = 'hilite_platform_admin';

export function PlatformAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedAdmin = localStorage.getItem(ADMIN_KEY);
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedAdmin && storedToken) {
      setAdmin(JSON.parse(storedAdmin));
    }
    setIsLoading(false);
  }, []);

  async function login(email, password) {
    try {
      const { accessToken, refreshToken, admin: loggedInAdmin } = await platformApi.login(email, password);
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(loggedInAdmin));
      setAdmin(loggedInAdmin);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    // Best-effort: revoke server-side so the refresh token can't be used
    // again even if it leaked, but don't block clearing local state on it.
    if (refreshToken) platformApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ admin, isLoading, isAuthenticated: !!admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  return ctx;
}
