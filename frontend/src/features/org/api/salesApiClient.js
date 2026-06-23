import { createApiClient } from '../../../api/createApiClient';

const ORG_BASE_URL = import.meta.env.VITE_ORG_API_BASE_URL || 'http://localhost:4000/api/org';

// Leads live under /api/sales, but it's the same org-user session as
// everything else in this console — so this client reuses the org
// console's token storage keys and points its silent-refresh call back
// at /api/org/auth/refresh (the only place that endpoint actually exists).
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_SALES_API_BASE_URL || 'http://localhost:4000/api/sales',
  tokenKey: 'hilite_org_access_token',
  refreshTokenKey: 'hilite_org_refresh_token',
  refreshUrl: `${ORG_BASE_URL}/auth/refresh`,
  loginPath: '/org/login',
});

export { getErrorMessage } from '../../../api/createApiClient';
