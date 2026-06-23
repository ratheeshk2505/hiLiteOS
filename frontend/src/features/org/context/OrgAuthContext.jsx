import { createContext, useContext, useEffect, useState } from 'react';
import { orgApi } from '../api/orgApi';
import { getErrorMessage } from '../api/apiClient';

const OrgAuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'hilite_org_access_token';
const REFRESH_TOKEN_KEY = 'hilite_org_refresh_token';
const USER_KEY = 'hilite_org_user';
const ORG_KEY = 'hilite_org_organization';

export function OrgAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedOrg = localStorage.getItem(ORG_KEY);
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedUser && storedOrg && storedToken) {
      setUser(JSON.parse(storedUser));
      setOrganization(JSON.parse(storedOrg));
    }
    setIsLoading(false);
  }, []);

  async function login(organizationCode, email, password) {
    try {
      const { accessToken, refreshToken, user: loggedInUser, organization: org } = await orgApi.login(
        organizationCode,
        email,
        password
      );
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      localStorage.setItem(ORG_KEY, JSON.stringify(org));
      setUser(loggedInUser);
      setOrganization(org);
      return { success: true, user: loggedInUser };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  }

  /** Merges a partial update into the cached user — used after a password change clears mustChangePassword, without needing a full re-login. */
  function updateUser(partial) {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    // Best-effort: revoke server-side so the refresh token can't be used
    // again even if it leaked, but don't block clearing local state on it.
    if (refreshToken) orgApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_KEY);
    setUser(null);
    setOrganization(null);
  }

  return (
    <OrgAuthContext.Provider value={{ user, organization, isLoading, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </OrgAuthContext.Provider>
  );
}

export function useOrgAuth() {
  const ctx = useContext(OrgAuthContext);
  if (!ctx) throw new Error('useOrgAuth must be used within an OrgAuthProvider');
  return ctx;
}
