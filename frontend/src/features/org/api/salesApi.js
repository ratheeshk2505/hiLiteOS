import { apiClient } from './salesApiClient';

export const salesApi = {
  listAssignableUsers: () => apiClient.get('/leads/assignable-users').then((r) => r.data.data),

  listLeads: (params = {}) =>
    apiClient.get('/leads', { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta })),
  createLead: (payload) => apiClient.post('/leads', payload).then((r) => r.data.data),
  getLead: (id) => apiClient.get(`/leads/${id}`).then((r) => r.data.data),
  updateLead: (id, payload) => apiClient.patch(`/leads/${id}`, payload).then((r) => r.data.data),
  updateLeadStatus: (id, status) => apiClient.patch(`/leads/${id}/status`, { status }).then((r) => r.data.data),
  assignLead: (id, payload) => apiClient.patch(`/leads/${id}/assign`, payload).then((r) => r.data.data),

  listActivities: (leadId, params = {}) =>
    apiClient.get(`/leads/${leadId}/activities`, { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta })),
  createActivity: (leadId, payload) => apiClient.post(`/leads/${leadId}/activities`, payload).then((r) => r.data.data),
};
