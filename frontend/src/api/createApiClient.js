import axios from 'axios';

/**
 * Builds an isolated axios client for one console (platform or org),
 * each with its own base URL and its own token storage keys. Platform
 * admins and org users are different principals with different tokens —
 * keeping their clients separate means a stale org token can never leak
 * onto a platform request or vice versa.
 *
 * Access tokens are short-lived (15m) to limit how long a stolen one is
 * useful — so every client here also knows how to silently exchange its
 * refresh token for a new access token on a 401, exactly once per failed
 * request, before giving up and sending the user back to login. Several
 * requests can 401 around the same moment (e.g. a page that fires off 3
 * API calls right as the token expires); they all share a single in-flight
 * refresh instead of each independently hitting /auth/refresh.
 */
export function createApiClient({ baseURL, tokenKey, refreshTokenKey, refreshPath, refreshUrl, loginPath }) {
  const client = axios.create({ baseURL });
  let refreshPromise = null;
  const resolvedRefreshUrl = refreshUrl || `${baseURL}${refreshPath}`;

  function getAccessToken() {
    return localStorage.getItem(tokenKey);
  }

  function storeTokens({ accessToken, refreshToken }) {
    localStorage.setItem(tokenKey, accessToken);
    if (refreshToken) localStorage.setItem(refreshTokenKey, refreshToken);
  }

  function clearTokens() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshTokenKey);
  }

  function redirectToLogin() {
    clearTokens();
    if (window.location.pathname !== loginPath) {
      window.location.href = loginPath;
    }
  }

  async function performRefresh() {
    const refreshToken = localStorage.getItem(refreshTokenKey);
    if (!refreshToken) throw new Error('No refresh token available');
    // Plain axios call, not `client` — going through the same instance
    // would re-trigger these same interceptors.
    const response = await axios.post(resolvedRefreshUrl, { refreshToken });
    const tokens = response.data.data;
    storeTokens(tokens);
    return tokens.accessToken;
  }

  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      const isAuthEndpoint = config?.url?.includes(refreshPath) || config?.url?.includes('/auth/login');

      if (response?.status === 401 && !config._retried && !isAuthEndpoint) {
        config._retried = true;
        try {
          refreshPromise = refreshPromise || performRefresh();
          const newAccessToken = await refreshPromise;
          refreshPromise = null;
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(config);
        } catch (refreshError) {
          refreshPromise = null;
          redirectToLogin();
          return Promise.reject(refreshError);
        }
      }

      if (response?.status === 401) {
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Pulls a clean, displayable message out of an API error response,
 * whether it's a single message or a validation `details` array.
 */
export function getErrorMessage(error) {
  const apiError = error?.response?.data?.error;
  if (!apiError) return 'Something went wrong. Please try again.';
  if (Array.isArray(apiError.details) && apiError.details.length) {
    return apiError.details.join(', ');
  }
  return apiError.message || 'Something went wrong. Please try again.';
}
