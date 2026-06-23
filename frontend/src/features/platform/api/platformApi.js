import { apiClient } from './apiClient';

export const platformApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }).then((r) => r.data.data),

  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data.data),

  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data.data),

  listModules: () => apiClient.get('/modules').then((r) => r.data.data),

  createModule: (payload) => apiClient.post('/modules', payload).then((r) => r.data.data),

  updateModule: (id, payload) => apiClient.patch(`/modules/${id}`, payload).then((r) => r.data.data),

  listOrganizations: (params = {}) =>
    apiClient.get('/organizations', { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta })),

  getOrganization: (id) => apiClient.get(`/organizations/${id}`).then((r) => r.data.data),

  createOrganization: (payload) => apiClient.post('/organizations', payload).then((r) => r.data.data),

  updateOrganizationStatus: (id, status) =>
    apiClient.patch(`/organizations/${id}/status`, { status }).then((r) => r.data.data),

  resetAdminPassword: (id) => apiClient.post(`/organizations/${id}/reset-admin-password`).then((r) => r.data.data),

  updateOrganizationModules: (id, modules) =>
    apiClient.patch(`/organizations/${id}/modules`, { modules }).then((r) => r.data.data),
};
