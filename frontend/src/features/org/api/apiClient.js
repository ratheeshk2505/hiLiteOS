import { createApiClient } from '../../../api/createApiClient';

export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_ORG_API_BASE_URL || 'http://localhost:4000/api/org',
  tokenKey: 'hilite_org_access_token',
  refreshTokenKey: 'hilite_org_refresh_token',
  refreshPath: '/auth/refresh',
  loginPath: '/org/login',
});

export { getErrorMessage } from '../../../api/createApiClient';
