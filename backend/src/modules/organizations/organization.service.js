const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { hashPassword, generateTempPassword } = require('../../utils/password');
const { DEFAULT_ROLES } = require('../../constants/roles');
const { recordAudit } = require('../../utils/auditLog');
const { revokeAllForOrganization, revokeAllForSubject } = require('../../utils/refreshToken');
const { parsePagination, buildMeta } = require('../../utils/pagination');

/**
 * Creates an organization, seeds its module flags from the master catalog
 * (defaulting to enabled, or honoring an explicit `enabledModuleKeys` list),
 * seeds default roles, and creates the org's first admin user — all in one
 * transaction so a partial org (e.g. no admin user) can never be left
 * behind by a crash.
 */
async function createOrganization({ name, code, logoUrl, description, adminName, adminEmail, enabledModuleKeys }, actorId) {
  const result = await withTransaction(async (client) => {
    const orgResult = await client.query(
      `INSERT INTO organizations (name, code, logo_url, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, code, logo_url, description, status, created_at`,
      [name.trim(), code.trim().toLowerCase(), logoUrl || null, description || null]
    );
    const org = orgResult.rows[0];

    const modulesResult = await client.query('SELECT id, key FROM modules');
    const allModules = modulesResult.rows;

    for (const mod of allModules) {
      const enabled = Array.isArray(enabledModuleKeys) ? enabledModuleKeys.includes(mod.key) : true;
      await client.query(
        `INSERT INTO organization_modules (organization_id, module_id, enabled)
         VALUES ($1, $2, $3)`,
        [org.id, mod.id, enabled]
      );
    }

    for (const role of DEFAULT_ROLES) {
      await client.query(
        `INSERT INTO roles (organization_id, name, is_default, data_scope) VALUES ($1, $2, true, $3)`,
        [org.id, role.name, role.dataScope]
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const adminResult = await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, is_org_admin, must_change_password)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING id, name, email, is_org_admin, is_active, created_at`,
      [org.id, adminName.trim(), adminEmail.trim().toLowerCase(), passwordHash]
    );
    const admin = adminResult.rows[0];

    return { organization: org, adminUser: admin, tempPassword };
  });

  await recordAudit({
    organizationId: result.organization.id,
    actorType: 'platform_admin',
    actorId,
    action: 'organization.created',
    targetType: 'organization',
    targetId: result.organization.id,
    metadata: { name: result.organization.name, code: result.organization.code },
  });

  return result;
}

async function listOrganizations({ search, status, page, pageSize }) {
  const { offset, page: normalizedPage, pageSize: normalizedPageSize } = parsePagination({ page, pageSize });

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(o.name) LIKE $${params.length} OR LOWER(o.code) LIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM organizations o ${whereClause}`, params);
  const total = countResult.rows[0].total;

  const dataParams = [...params, normalizedPageSize, offset];
  const result = await query(
    `SELECT
        o.id, o.name, o.code, o.logo_url, o.description, o.status, o.created_at,
        COUNT(DISTINCT u.id)::int AS user_count,
        COUNT(DISTINCT om.module_id) FILTER (WHERE om.enabled)::int AS enabled_module_count
     FROM organizations o
     LEFT JOIN users u ON u.organization_id = o.id
     LEFT JOIN organization_modules om ON om.organization_id = o.id
     ${whereClause}
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows: result.rows, meta: buildMeta({ page: normalizedPage, pageSize: normalizedPageSize, total }) };
}

async function getOrganizationById(id) {
  const orgResult = await query(
    `SELECT id, name, code, logo_url, description, status, created_at, updated_at
     FROM organizations WHERE id = $1`,
    [id]
  );
  const org = orgResult.rows[0];
  if (!org) throw ApiError.notFound('Organization not found');

  const modulesResult = await query(
    `SELECT m.id AS module_id, m.key, m.name, m.description, COALESCE(om.enabled, false) AS enabled
     FROM modules m
     LEFT JOIN organization_modules om ON om.module_id = m.id AND om.organization_id = $1
     ORDER BY m.id ASC`,
    [id]
  );

  const adminResult = await query(
    `SELECT id, name, email, is_org_admin, is_active, created_at
     FROM users WHERE organization_id = $1 AND is_org_admin = true
     ORDER BY created_at ASC LIMIT 1`,
    [id]
  );

  return { ...org, modules: modulesResult.rows, primaryAdmin: adminResult.rows[0] || null };
}

/**
 * Recovery path for a locked-out org admin: there's no email-based "forgot
 * password" flow in this MVP, and an org admin who forgot their password
 * can't use the self-service change-password endpoint (it requires knowing
 * the current one) — they can't even log in to reach it. A platform admin
 * is the only principal above them able to intervene, so this generates a
 * fresh temp password the same way org creation does, shown once, and
 * kills any session the old password might still be propping up.
 */
async function resetAdminPassword(id, actorId) {
  const adminResult = await query(
    `SELECT id, name, email FROM users WHERE organization_id = $1 AND is_org_admin = true
     ORDER BY created_at ASC LIMIT 1`,
    [id]
  );
  const admin = adminResult.rows[0];
  if (!admin) throw ApiError.notFound('This organization has no admin user to reset');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [passwordHash, admin.id]);
  await revokeAllForSubject({ subjectType: 'org_user', subjectId: admin.id });

  await recordAudit({
    organizationId: id,
    actorType: 'platform_admin',
    actorId,
    action: 'organization.admin_password_reset',
    targetType: 'user',
    targetId: admin.id,
  });

  return { adminUser: admin, tempPassword };
}

async function updateStatus(id, status, actorId) {
  const result = await query(
    `UPDATE organizations SET status = $1, updated_at = now() WHERE id = $2
     RETURNING id, name, code, status, updated_at`,
    [status, id]
  );
  if (!result.rows[0]) throw ApiError.notFound('Organization not found');

  if (status === 'suspended') {
    // Suspending should end access immediately, not just block future
    // logins — every active session for this org's users is revoked here.
    await revokeAllForOrganization(id);
  }

  await recordAudit({
    organizationId: id,
    actorType: 'platform_admin',
    actorId,
    action: status === 'suspended' ? 'organization.suspended' : 'organization.reactivated',
    targetType: 'organization',
    targetId: id,
  });

  return result.rows[0];
}

async function updateModules(id, modules, actorId) {
  const updated = await withTransaction(async (client) => {
    const orgCheck = await client.query('SELECT id FROM organizations WHERE id = $1', [id]);
    if (!orgCheck.rows[0]) throw ApiError.notFound('Organization not found');

    for (const m of modules) {
      await client.query(
        `INSERT INTO organization_modules (organization_id, module_id, enabled, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (organization_id, module_id)
         DO UPDATE SET enabled = $3, updated_at = now()`,
        [id, m.moduleId, m.enabled]
      );
    }

    const result = await client.query(
      `SELECT m.id AS module_id, m.key, m.name, om.enabled
       FROM modules m
       LEFT JOIN organization_modules om ON om.module_id = m.id AND om.organization_id = $1
       ORDER BY m.id ASC`,
      [id]
    );
    return result.rows;
  });

  await recordAudit({
    organizationId: id,
    actorType: 'platform_admin',
    actorId,
    action: 'organization.modules_updated',
    targetType: 'organization',
    targetId: id,
    metadata: { modules },
  });

  return updated;
}

module.exports = {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  resetAdminPassword,
  updateStatus,
  updateModules,
};
