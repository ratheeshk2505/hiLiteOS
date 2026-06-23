const { query } = require('../config/db');

/**
 * Records a security/business-relevant action. Deliberately swallows its
 * own errors (logged, not thrown) — an audit log failing to write should
 * never be the reason a real request fails. For actions that must be
 * atomic with the audit record (rare), call query() directly inside the
 * same transaction instead of using this helper.
 */
async function recordAudit({ organizationId = null, actorType, actorId, action, targetType = null, targetId = null, metadata = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (organization_id, actor_type, actor_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organizationId, actorType, actorId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] Failed to record audit log:', action, err.message);
  }
}

module.exports = { recordAudit };
