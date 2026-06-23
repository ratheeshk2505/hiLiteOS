import { apiClient } from './notificationApiClient';

export const notificationApi = {
  list: (params = {}) =>
    apiClient.get('/', { params }).then((r) => ({ rows: r.data.data, meta: r.data.meta })),
  unreadCount: () => apiClient.get('/unread-count').then((r) => r.data.data.count),
  markAsRead: (id) => apiClient.patch(`/${id}/read`).then((r) => r.data.data),
  markAllAsRead: () => apiClient.post('/mark-all-read').then((r) => r.data.data),
};
