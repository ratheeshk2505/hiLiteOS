const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../../utils/auditLog');

const VALID_SCOPES = ['own', 'team', 'organization'];

async function createRole(organizationId, { name, dataScope }) {
  const scope = VALID_SCOPES.includes(dataScope) ? dataScope : 'own';
  const result = await query(
    `INSERT INTO roles (organization_id, name, is_default, data_scope)
     VALUES ($1, $2, false, $3)
     RETURNING id, name, is_default, data_scope, created_at, updated_at`,
    [organizationId, name.trim(), scope]
  );
  return { ...result.rows[0], user_count: 0 };
}

async function listRoles(organizationId) {
  const result = await query(
    `SELECT r.id, r.name, r.is_default, r.data_scope, r.created_at, r.updated_at,
            COUNT(u.id)::int AS user_count
     FROM roles r
     LEFT JOIN users u ON u.role_id = r.id
     WHERE r.organization_id = $1
     GROUP BY r.id
     ORDER BY r.is_default DESC, r.created_at ASC`,
    [organizationId]
  );
  return result.rows;
}

async function getRoleOrThrow(organizationId, roleId) {
  const result = await query(
    'SELECT id, name, is_default, data_scope FROM roles WHERE id = $1 AND organization_id = $2',
    [roleId, organizationId]
  );
  if (!result.rows[0]) throw ApiError.notFound('Role not found');
  return result.rows[0];
}

async function updateRole(organizationId, roleId, { name, dataScope }) {
  const existing = await getRoleOrThrow(organizationId, roleId);
  const scope = VALID_SCOPES.includes(dataScope) ? dataScope : existing.data_scope;
  const result = await query(
    `UPDATE roles SET name = $1, data_scope = $2, updated_at = now()
     WHERE id = $3 AND organization_id = $4
     RETURNING id, name, is_default, data_scope, created_at, updated_at`,
    [name.trim(), scope, roleId, organizationId]
  );
  return result.rows[0];
}

async function deleteRole(organizationId, roleId, actorId) {
  const role = await getRoleOrThrow(organizationId, roleId);
  if (role.is_default) {
    throw ApiError.badRequest('Default roles cannot be deleted, only renamed');
  }

  const usageResult = await query('SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1', [roleId]);
  if (usageResult.rows[0].count > 0) {
    throw ApiError.conflict('Reassign the users on this role before deleting it');
  }

  await query('DELETE FROM roles WHERE id = $1 AND organization_id = $2', [roleId, organizationId]);
  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: 'role.deleted',
    targetType: 'role',
    targetId: roleId,
    metadata: { name: role.name },
  });
}

module.exports = { createRole, listRoles, updateRole, deleteRole, VALID_SCOPES };
