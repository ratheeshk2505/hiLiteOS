const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../../utils/auditLog');

async function listAll() {
  const result = await query('SELECT id, key, name, description, created_at FROM modules ORDER BY id ASC');
  return result.rows;
}

/**
 * Adding a module here doesn't need to touch any existing organization —
 * every per-org read already LEFT JOINs modules against
 * organization_modules and defaults missing rows to `enabled: false`
 * (see organization.service.js#getOrganizationById), and the per-org
 * update is an upsert. A brand-new module simply shows up as "off" for
 * every existing org until a platform admin explicitly turns it on for
 * one, which is the right default for something orgs haven't opted into.
 */
async function create({ key, name, description }, actorId) {
  const result = await query(
    `INSERT INTO modules (key, name, description) VALUES ($1, $2, $3)
     RETURNING id, key, name, description, created_at`,
    [key.trim().toLowerCase(), name.trim(), description || null]
  );
  const module = result.rows[0];

  await recordAudit({
    actorType: 'platform_admin',
    actorId,
    action: 'module.created',
    targetType: 'module',
    targetId: String(module.id),
    metadata: { key: module.key, name: module.name },
  });

  return module;
}

async function update(id, { name, description }, actorId) {
  const existing = await query('SELECT id, name, description FROM modules WHERE id = $1', [id]);
  const current = existing.rows[0];
  if (!current) throw ApiError.notFound('Module not found');

  const nextName = name !== undefined ? name.trim() : current.name;
  const nextDescription = description !== undefined ? description : current.description;

  const result = await query(
    `UPDATE modules SET name = $1, description = $2 WHERE id = $3
     RETURNING id, key, name, description, created_at`,
    [nextName, nextDescription, id]
  );
  const module = result.rows[0];

  await recordAudit({
    actorType: 'platform_admin',
    actorId,
    action: 'module.updated',
    targetType: 'module',
    targetId: String(module.id),
    metadata: { name: module.name },
  });

  return module;
}

module.exports = { listAll, create, update };
