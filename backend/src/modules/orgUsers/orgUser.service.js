const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { hashPassword, generateTempPassword } = require('../../utils/password');
const { recordAudit } = require('../../utils/auditLog');
const { revokeAllForSubject } = require('../../utils/refreshToken');
const { parsePagination, buildMeta } = require('../../utils/pagination');

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.is_org_admin, u.is_active, u.created_at,
         t.id AS team_id, t.name AS team_name,
         r.id AS role_id, r.name AS role_name
  FROM users u
  LEFT JOIN teams t ON t.id = u.team_id
  LEFT JOIN roles r ON r.id = u.role_id
`;

/**
 * Confirms a team/role id was not just guessed from another tenant —
 * every assignment is checked against this organization's own rows before
 * it's allowed to stick.
 */
async function assertBelongsToOrg(table, id, organizationId, label) {
  if (!id) return;
  const result = await query(`SELECT id FROM ${table} WHERE id = $1 AND organization_id = $2`, [id, organizationId]);
  if (!result.rows[0]) throw ApiError.badRequest(`${label} not found in this organization`);
}

async function createUser(organizationId, { name, email, teamId, roleId }, actorId) {
  await assertBelongsToOrg('teams', teamId, organizationId, 'Team');
  await assertBelongsToOrg('roles', roleId, organizationId, 'Role');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const result = await query(
    `INSERT INTO users (organization_id, name, email, password_hash, team_id, role_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id`,
    [organizationId, name.trim(), email.trim().toLowerCase(), passwordHash, teamId || null, roleId || null]
  );

  const user = await getUserOrThrow(organizationId, result.rows[0].id);

  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: 'user.created',
    targetType: 'user',
    targetId: user.id,
    metadata: { email: user.email },
  });

  return { ...user, tempPassword };
}

async function listUsers(organizationId, { search, teamId, roleId, status, page, pageSize }) {
  const { offset, page: normalizedPage, pageSize: normalizedPageSize } = parsePagination({ page, pageSize });

  const conditions = ['u.organization_id = $1'];
  const params = [organizationId];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
  }
  if (teamId) {
    params.push(teamId);
    conditions.push(`u.team_id = $${params.length}`);
  }
  if (roleId) {
    params.push(roleId);
    conditions.push(`u.role_id = $${params.length}`);
  }
  if (status === 'active') conditions.push('u.is_active = true');
  if (status === 'inactive') conditions.push('u.is_active = false');

  const whereClause = conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM users u WHERE ${whereClause}`, params);
  const total = countResult.rows[0].total;

  const dataParams = [...params, normalizedPageSize, offset];
  const result = await query(
    `${USER_SELECT} WHERE ${whereClause} ORDER BY u.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows: result.rows, meta: buildMeta({ page: normalizedPage, pageSize: normalizedPageSize, total }) };
}

async function getUserOrThrow(organizationId, userId) {
  const result = await query(`${USER_SELECT} WHERE u.id = $1 AND u.organization_id = $2`, [userId, organizationId]);
  if (!result.rows[0]) throw ApiError.notFound('User not found');
  return result.rows[0];
}

async function updateAssignment(organizationId, userId, { teamId, roleId }, actorId) {
  await getUserOrThrow(organizationId, userId);
  await assertBelongsToOrg('teams', teamId, organizationId, 'Team');
  await assertBelongsToOrg('roles', roleId, organizationId, 'Role');

  await query(
    `UPDATE users SET team_id = $1, role_id = $2 WHERE id = $3 AND organization_id = $4`,
    [teamId || null, roleId || null, userId, organizationId]
  );

  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: 'user.reassigned',
    targetType: 'user',
    targetId: userId,
    metadata: { teamId, roleId },
  });

  return getUserOrThrow(organizationId, userId);
}

async function updateStatus(organizationId, userId, isActive, actorId) {
  const user = await getUserOrThrow(organizationId, userId);
  if (user.is_org_admin && !isActive) {
    throw ApiError.badRequest('The organization admin account cannot be deactivated');
  }
  await query('UPDATE users SET is_active = $1 WHERE id = $2 AND organization_id = $3', [isActive, userId, organizationId]);

  if (!isActive) {
    // Deactivation should end any session this user already has open, not
    // just block their next login attempt.
    await revokeAllForSubject({ subjectType: 'org_user', subjectId: userId });
  }

  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: isActive ? 'user.activated' : 'user.deactivated',
    targetType: 'user',
    targetId: userId,
  });

  return getUserOrThrow(organizationId, userId);
}

/**
 * Lets an org admin reset any of their users' passwords without knowing
 * the old one — the same recovery need as the platform-level admin reset,
 * one level down: a user who forgot their password can't reach the
 * self-service change-password endpoint either, since that also requires
 * the current password. Old sessions are killed so a forgotten-then-found
 * password can't still be used to stay logged in somewhere.
 */
async function resetPassword(organizationId, userId, actorId) {
  const user = await getUserOrThrow(organizationId, userId);

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2 AND organization_id = $3', [passwordHash, userId, organizationId]);
  await revokeAllForSubject({ subjectType: 'org_user', subjectId: userId });

  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: 'user.password_reset',
    targetType: 'user',
    targetId: userId,
  });

  return { ...user, tempPassword };
}

module.exports = { createUser, listUsers, getUserOrThrow, updateAssignment, updateStatus, resetPassword };
