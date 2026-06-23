const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { getLeadRowOrThrow, canAccessLead } = require('./lead.service');
const { parsePagination, buildMeta } = require('../../utils/pagination');

async function assertLeadAccess(organizationId, orgUser, leadId) {
  const lead = await getLeadRowOrThrow(leadId, organizationId);
  if (!canAccessLead(orgUser, lead)) throw ApiError.forbidden('You do not have access to this lead');
  return lead;
}

async function createActivity(organizationId, orgUser, leadId, { type, notes, occurredAt }) {
  await assertLeadAccess(organizationId, orgUser, leadId);

  const result = await query(
    `INSERT INTO activities (lead_id, organization_id, type, notes, occurred_at, created_by_id)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()), $6)
     RETURNING id, lead_id, type, notes, occurred_at, created_at`,
    [leadId, organizationId, type, notes || null, occurredAt || null, orgUser.id]
  );

  const activity = result.rows[0];
  const creatorResult = await query('SELECT name FROM users WHERE id = $1', [orgUser.id]);
  return { ...activity, created_by_name: creatorResult.rows[0]?.name || null };
}

async function listActivities(organizationId, orgUser, leadId, { page, pageSize }) {
  await assertLeadAccess(organizationId, orgUser, leadId);
  const { offset, page: normalizedPage, pageSize: normalizedPageSize } = parsePagination({ page, pageSize });

  const countResult = await query('SELECT COUNT(*)::int AS total FROM activities WHERE lead_id = $1', [leadId]);
  const total = countResult.rows[0].total;

  const result = await query(
    `SELECT a.id, a.lead_id, a.type, a.notes, a.occurred_at, a.created_at, u.name AS created_by_name
     FROM activities a
     LEFT JOIN users u ON u.id = a.created_by_id
     WHERE a.lead_id = $1
     ORDER BY a.occurred_at DESC
     LIMIT $2 OFFSET $3`,
    [leadId, normalizedPageSize, offset]
  );

  return { rows: result.rows, meta: buildMeta({ page: normalizedPage, pageSize: normalizedPageSize, total }) };
}

module.exports = { createActivity, listActivities };
