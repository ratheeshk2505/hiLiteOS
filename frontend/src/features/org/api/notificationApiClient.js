import { createApiClient } from '../../../api/createApiClient';

const ORG_BASE_URL = import.meta.env.VITE_ORG_API_BASE_URL || 'http://localhost:4000/api/org';

export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_NOTIFICATIONS_API_BASE_URL || 'http://localhost:4000/api/notifications',
  tokenKey: 'hilite_org_access_token',
  refreshTokenKey: 'hilite_org_refresh_token',
  refreshUrl: `${ORG_BASE_URL}/auth/refresh`,
  loginPath: '/org/login',
});

export { getErrorMessage } from '../../../api/createApiClient';
