import { apiClient } from './dashboardApiClient';

export const dashboardApi = {
  getSummary: () => apiClient.get('/summary').then((r) => r.data.data),
};
