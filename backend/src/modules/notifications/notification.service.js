const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');

async function create({ organizationId, userId, type, title, body, leadId }) {
  await query(
    `INSERT INTO notifications (organization_id, user_id, type, title, body, lead_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [organizationId, userId, type, title, body || null, leadId || null]
  );
}

async function listForUser(organizationId, userId, { unreadOnly, page, pageSize }) {
  const { offset, page: normalizedPage, pageSize: normalizedPageSize } = parsePagination({ page, pageSize });

  const conditions = ['organization_id = $1', 'user_id = $2'];
  const params = [organizationId, userId];
  if (unreadOnly === 'true' || unreadOnly === true) conditions.push('is_read = false');
  const whereClause = conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM notifications WHERE ${whereClause}`, params);
  const total = countResult.rows[0].total;

  const dataParams = [...params, normalizedPageSize, offset];
  const result = await query(
    `SELECT id, type, title, body, lead_id, is_read, created_at FROM notifications
     WHERE ${whereClause} ORDER BY created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows: result.rows, meta: buildMeta({ page: normalizedPage, pageSize: normalizedPageSize, total }) };
}

async function getUnreadCount(organizationId, userId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE organization_id = $1 AND user_id = $2 AND is_read = false',
    [organizationId, userId]
  );
  return result.rows[0].count;
}

async function markAsRead(organizationId, userId, notificationId) {
  const result = await query(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND organization_id = $2 AND user_id = $3
     RETURNING id, type, title, body, lead_id, is_read, created_at`,
    [notificationId, organizationId, userId]
  );
  if (!result.rows[0]) throw ApiError.notFound('Notification not found');
  return result.rows[0];
}

async function markAllAsRead(organizationId, userId) {
  await query(
    'UPDATE notifications SET is_read = true WHERE organization_id = $1 AND user_id = $2 AND is_read = false',
    [organizationId, userId]
  );
}

module.exports = { create, listForUser, getUnreadCount, markAsRead, markAllAsRead };
