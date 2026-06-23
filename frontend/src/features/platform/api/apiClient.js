import { createApiClient } from '../../../api/createApiClient';

export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:4000/api/platform',
  tokenKey: 'hilite_platform_access_token',
  refreshTokenKey: 'hilite_platform_refresh_token',
  refreshPath: '/auth/refresh',
  loginPath: '/platform/login',
});

export { getErrorMessage } from '../../../api/createApiClient';
