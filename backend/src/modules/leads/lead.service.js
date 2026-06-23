const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, buildMeta } = require('../../utils/pagination');
const { publish } = require('../../events/eventBus');

const LEAD_SELECT = `
  SELECT l.id, l.name, l.mobile_number, l.email, l.source, l.project, l.status,
         l.created_at, l.updated_at,
         au.id AS assigned_user_id, au.name AS assigned_user_name, au.team_id AS assigned_user_team_id,
         cu.id AS created_by_id, cu.name AS created_by_name
  FROM leads l
  LEFT JOIN users au ON au.id = l.assigned_user_id
  LEFT JOIN users cu ON cu.id = l.created_by_id
`;

/**
 * Translates a caller's data_scope into the WHERE fragment that actually
 * enforces it. This is the one place that decision gets made — every
 * list/detail/mutation path below goes through here rather than each
 * re-implementing its own notion of "can this person see this lead",
 * which is exactly how those checks tend to drift out of sync over time.
 */
function scopeCondition(orgUser, paramsRef) {
  if (orgUser.isOrgAdmin || orgUser.dataScope === 'organization') {
    return '1=1';
  }
  if (orgUser.dataScope === 'team') {
    if (!orgUser.teamId) return '1=0'; // team-scoped but not on a team -> sees nothing, not everything
    paramsRef.push(orgUser.teamId);
    return `au.team_id = $${paramsRef.length}`;
  }
  // 'own' — the most restrictive, and the default for any role without
  // an explicit wider scope.
  paramsRef.push(orgUser.id);
  return `l.assigned_user_id = $${paramsRef.length}`;
}

/** Used for single-lead access checks after the row's already been fetched. */
function canAccessLead(orgUser, lead) {
  if (orgUser.isOrgAdmin || orgUser.dataScope === 'organization') return true;
  if (orgUser.dataScope === 'team') return !!orgUser.teamId && lead.assigned_user_team_id === orgUser.teamId;
  return lead.assigned_user_id === orgUser.id;
}

/** Manual assignment still has to respect scope — a team-scoped user can't hand a lead to someone outside their team. */
async function assertCanAssignTo(organizationId, orgUser, targetUserId) {
  const result = await query('SELECT id, organization_id, team_id, is_active FROM users WHERE id = $1', [targetUserId]);
  const target = result.rows[0];
  if (!target || target.organization_id !== organizationId) {
    throw ApiError.badRequest('Assigned user not found in this organization');
  }
  if (!target.is_active) {
    throw ApiError.badRequest('Cannot assign a lead to a deactivated user');
  }
  if (orgUser.isOrgAdmin || orgUser.dataScope === 'organization') return;
  if (orgUser.dataScope === 'team') {
    if (target.team_id !== orgUser.teamId) {
      throw ApiError.forbidden('You can only assign leads to members of your own team');
    }
    return;
  }
  if (targetUserId !== orgUser.id) {
    throw ApiError.forbidden('You can only assign leads to yourself');
  }
}

/**
 * A minimal, properly-scoped list of users a caller could assign a lead
 * to — used by the assignment UI. Deliberately NOT the same as Module 2's
 * GET /api/org/users (admin-only, full HR-style detail): any org user
 * needs to know who their teammates are to hand off a lead, but that's a
 * much narrower exposure (just id + name, scoped to what they're already
 * allowed to act on) than the admin user-management list.
 */
async function listAssignableUsers(organizationId, orgUser) {
  const params = [organizationId];
  let scopeFilter = '';

  if (orgUser.isOrgAdmin || orgUser.dataScope === 'organization') {
    scopeFilter = '';
  } else if (orgUser.dataScope === 'team') {
    if (!orgUser.teamId) return [];
    params.push(orgUser.teamId);
    scopeFilter = `AND team_id = $${params.length}`;
  } else {
    params.push(orgUser.id);
    scopeFilter = `AND id = $${params.length}`;
  }

  const result = await query(
    `SELECT id, name, team_id FROM users WHERE organization_id = $1 AND is_active = true ${scopeFilter} ORDER BY name ASC`,
    params
  );
  return result.rows;
}

async function createLead(organizationId, orgUser, { name, mobileNumber, email, source, project, assignedUserId }) {
  const resolvedAssigneeId = assignedUserId || orgUser.id;
  await assertCanAssignTo(organizationId, orgUser, resolvedAssigneeId);

  const lead = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO leads (organization_id, name, mobile_number, email, source, project, assigned_user_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [organizationId, name.trim(), mobileNumber.trim(), email || null, source || null, project || null, resolvedAssigneeId, orgUser.id]
    );
    const leadId = result.rows[0].id;

    await client.query(
      `INSERT INTO lead_status_history (lead_id, from_status, to_status, changed_by_id) VALUES ($1, NULL, 'new', $2)`,
      [leadId, orgUser.id]
    );

    return getLeadRowOrThrow(leadId, organizationId, client);
  });

  publish('lead.created', { organizationId, leadId: lead.id, assignedUserId: lead.assigned_user_id, createdById: orgUser.id });
  if (resolvedAssigneeId) {
    publish('lead.assigned', { organizationId, leadId: lead.id, assignedUserId: resolvedAssigneeId, assignedById: orgUser.id });
  }

  return lead;
}

async function getLeadRowOrThrow(leadId, organizationId, client = { query }) {
  const result = await client.query(`${LEAD_SELECT} WHERE l.id = $1 AND l.organization_id = $2`, [leadId, organizationId]);
  if (!result.rows[0]) throw ApiError.notFound('Lead not found');
  return result.rows[0];
}

async function listLeads(organizationId, orgUser, { search, status, project, assignedUserId, page, pageSize }) {
  const { offset, page: normalizedPage, pageSize: normalizedPageSize } = parsePagination({ page, pageSize });

  const params = [organizationId];
  const conditions = ['l.organization_id = $1'];
  conditions.push(scopeCondition(orgUser, params));

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(l.name) LIKE $${params.length} OR l.mobile_number LIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }
  if (project) {
    params.push(`%${project.toLowerCase()}%`);
    conditions.push(`LOWER(l.project) LIKE $${params.length}`);
  }
  if (assignedUserId) {
    params.push(assignedUserId);
    conditions.push(`l.assigned_user_id = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM leads l LEFT JOIN users au ON au.id = l.assigned_user_id WHERE ${whereClause}`, params);
  const total = countResult.rows[0].total;

  const dataParams = [...params, normalizedPageSize, offset];
  const result = await query(
    `${LEAD_SELECT} WHERE ${whereClause} ORDER BY l.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows: result.rows, meta: buildMeta({ page: normalizedPage, pageSize: normalizedPageSize, total }) };
}

async function getLead(organizationId, orgUser, leadId) {
  const lead = await getLeadRowOrThrow(leadId, organizationId);
  if (!canAccessLead(orgUser, lead)) throw ApiError.forbidden('You do not have access to this lead');
  return lead;
}

/**
 * Editing a lead's core details (a typo'd phone number, an updated
 * project) uses the same access check as viewing it — if you can see a
 * lead, you can fix its details — rather than introducing a separate
 * permission tier. Status and assignment are deliberately excluded here:
 * they have their own endpoints because they need their own side effects
 * (status history rows, domain events) that a generic field update
 * shouldn't trigger.
 */
async function updateLead(organizationId, orgUser, leadId, { name, mobileNumber, email, source, project }) {
  const lead = await getLead(organizationId, orgUser, leadId);

  const nextName = name !== undefined ? name.trim() : lead.name;
  const nextMobile = mobileNumber !== undefined ? mobileNumber.trim() : lead.mobile_number;
  const nextEmail = email !== undefined ? (email || null) : lead.email;
  const nextSource = source !== undefined ? (source || null) : lead.source;
  const nextProject = project !== undefined ? (project || null) : lead.project;

  await query(
    `UPDATE leads SET name = $1, mobile_number = $2, email = $3, source = $4, project = $5, updated_at = now()
     WHERE id = $6 AND organization_id = $7`,
    [nextName, nextMobile, nextEmail, nextSource, nextProject, leadId, organizationId]
  );

  return getLeadRowOrThrow(leadId, organizationId);
}

async function updateStatus(organizationId, orgUser, leadId, newStatus) {
  const lead = await getLead(organizationId, orgUser, leadId);

  await withTransaction(async (client) => {
    await client.query('UPDATE leads SET status = $1, updated_at = now() WHERE id = $2', [newStatus, leadId]);
    await client.query(
      `INSERT INTO lead_status_history (lead_id, from_status, to_status, changed_by_id) VALUES ($1, $2, $3, $4)`,
      [leadId, lead.status, newStatus, orgUser.id]
    );
  });

  if (newStatus === 'won') {
    publish('lead.won', { organizationId, leadId, assignedUserId: lead.assigned_user_id });
  }

  return getLeadRowOrThrow(leadId, organizationId);
}

async function assignLead(organizationId, orgUser, leadId, { assignedUserId, strategy }) {
  const lead = await getLead(organizationId, orgUser, leadId);

  let resolvedAssigneeId = assignedUserId;

  if (strategy === 'least_loaded') {
    resolvedAssigneeId = await pickLeastLoadedUser(organizationId, orgUser, lead);
    if (!resolvedAssigneeId) throw ApiError.badRequest('No eligible active users found to assign this lead to');
  } else {
    if (!assignedUserId) throw ApiError.badRequest('assignedUserId is required for manual assignment');
    await assertCanAssignTo(organizationId, orgUser, assignedUserId);
  }

  await query('UPDATE leads SET assigned_user_id = $1, updated_at = now() WHERE id = $2', [resolvedAssigneeId, leadId]);
  publish('lead.assigned', { organizationId, leadId, assignedUserId: resolvedAssigneeId, assignedById: orgUser.id });

  return getLeadRowOrThrow(leadId, organizationId);
}

/**
 * Bonus: "least loaded" assignment — picks whichever eligible active user
 * currently has the fewest open (not won/lost) leads, so a manual
 * round-robin isn't needed to keep workload roughly even. The eligible
 * pool itself still respects the caller's scope: a team-scoped manager
 * can only auto-balance within their own team.
 */
async function pickLeastLoadedUser(organizationId, orgUser, lead) {
  const params = [organizationId];
  let teamFilter = '';
  if (!orgUser.isOrgAdmin && orgUser.dataScope === 'team') {
    if (!orgUser.teamId) return null;
    params.push(orgUser.teamId);
    teamFilter = `AND u.team_id = $${params.length}`;
  } else if (!orgUser.isOrgAdmin && orgUser.dataScope === 'own') {
    return orgUser.id; // an 'own'-scope user can only ever load-balance onto themselves
  }

  const result = await query(
    `SELECT u.id, COUNT(l.id) FILTER (WHERE l.status NOT IN ('won', 'lost')) AS open_count
     FROM users u
     LEFT JOIN leads l ON l.assigned_user_id = u.id
     WHERE u.organization_id = $1 AND u.is_active = true ${teamFilter}
     GROUP BY u.id
     ORDER BY open_count ASC, u.created_at ASC
     LIMIT 1`,
    params
  );
  return result.rows[0]?.id || null;
}

module.exports = { createLead, listLeads, getLead, updateLead, updateStatus, assignLead, listAssignableUsers, canAccessLead, getLeadRowOrThrow };
