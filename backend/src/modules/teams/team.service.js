const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../../utils/auditLog');

async function createTeam(organizationId, { name, description }) {
  const result = await query(
    `INSERT INTO teams (organization_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_at, updated_at`,
    [organizationId, name.trim(), description || null]
  );
  return { ...result.rows[0], member_count: 0 };
}

async function listTeams(organizationId) {
  const result = await query(
    `SELECT t.id, t.name, t.description, t.created_at, t.updated_at,
            COUNT(u.id)::int AS member_count
     FROM teams t
     LEFT JOIN users u ON u.team_id = t.id
     WHERE t.organization_id = $1
     GROUP BY t.id
     ORDER BY t.created_at ASC`,
    [organizationId]
  );
  return result.rows;
}

async function getTeamOrThrow(organizationId, teamId) {
  const result = await query(
    'SELECT id, name, description FROM teams WHERE id = $1 AND organization_id = $2',
    [teamId, organizationId]
  );
  if (!result.rows[0]) throw ApiError.notFound('Team not found');
  return result.rows[0];
}

async function updateTeam(organizationId, teamId, { name, description }) {
  await getTeamOrThrow(organizationId, teamId);
  const result = await query(
    `UPDATE teams SET name = $1, description = $2, updated_at = now()
     WHERE id = $3 AND organization_id = $4
     RETURNING id, name, description, created_at, updated_at`,
    [name.trim(), description || null, teamId, organizationId]
  );
  return result.rows[0];
}

async function deleteTeam(organizationId, teamId, actorId) {
  const team = await getTeamOrThrow(organizationId, teamId);
  // Members aren't deleted — the FK is ON DELETE SET NULL, so they simply
  // become unassigned and can be moved to another team afterward.
  await query('DELETE FROM teams WHERE id = $1 AND organization_id = $2', [teamId, organizationId]);
  await recordAudit({
    organizationId,
    actorType: 'org_user',
    actorId,
    action: 'team.deleted',
    targetType: 'team',
    targetId: teamId,
    metadata: { name: team.name },
  });
}

module.exports = { createTeam, listTeams, updateTeam, deleteTeam };
