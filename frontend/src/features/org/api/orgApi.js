import { apiClient } from './apiClient';

export const orgApi = {
  login: (organizationCode, email, password) =>
    apiClient.post('/auth/login', { organizationCode, email, password }).then((r) => r.data.data),

  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data.data),

  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data.data),

  // Teams
  listTeams: () => apiClient.get('/teams').then((r) => r.data.data),
  createTeam: (payload) => apiClient.post('/teams', payload).then((r) => r.data.data),
  updateTeam: (id, payload) => apiClient.patch(`/teams/${id}`, payload).then((r) => r.data.data),
  deleteTeam: (id) => apiClient.delete(`/teams/${id}`).then((r) => r.data.data),

  // Roles
  listRoles: () => apiClient.get('/roles').then((r) => r.data.data),
  createRole: (payload) => apiClient.post('/roles', payload).then((r) => r.data.data),
  updateRole: (id, payload) => apiClient.patch(`/roles/${id}`, payload).then((r) => r.data.data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`).then((r) => r.data.data),

  // Users
  listUsers: (params = {}) =>
    apiClient.get('/users', { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta })),
  createUser: (payload) => apiClient.post('/users', payload).then((r) => r.data.data),
  updateUserAssignment: (id, payload) => apiClient.patch(`/users/${id}/assignment`, payload).then((r) => r.data.data),
  resetUserPassword: (id) => apiClient.post(`/users/${id}/reset-password`).then((r) => r.data.data),
  updateUserStatus: (id, isActive) => apiClient.patch(`/users/${id}/status`, { isActive }).then((r) => r.data.data),

  // Modules — read-only; enablement is a platform-level decision, not editable here.
  listModules: () => apiClient.get('/modules').then((r) => r.data.data),
};
