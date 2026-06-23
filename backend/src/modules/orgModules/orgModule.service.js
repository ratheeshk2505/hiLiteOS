const { query } = require('../../config/db');

/**
 * Org admins can see which modules their organization has — useful for
 * knowing what's available (or why something isn't) — but cannot change
 * it themselves. Enablement is a platform-level decision (Module 1),
 * typically tied to billing/plan tier; if org admins could self-enable,
 * that gate would mean nothing. There is deliberately no
 * create/update/toggle path anywhere in this module.
 */
async function listForOrganization(organizationId) {
  const result = await query(
    `SELECT m.id AS module_id, m.key, m.name, m.description, COALESCE(om.enabled, false) AS enabled
     FROM modules m
     LEFT JOIN organization_modules om ON om.module_id = m.id AND om.organization_id = $1
     ORDER BY m.id ASC`,
    [organizationId]
  );
  return result.rows;
}

module.exports = { listForOrganization };
