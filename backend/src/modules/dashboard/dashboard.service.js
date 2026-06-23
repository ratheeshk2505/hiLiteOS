const { query } = require('../../config/db');

/**
 * Every figure here is a SQL aggregate, never "load all leads into JS and
 * count them" — the same discipline as Module 3's list endpoints, and for
 * the same reason: this is exactly the kind of endpoint someone hits
 * constantly (it's a dashboard), so it needs to stay cheap as lead volume
 * grows instead of degrading with it.
 */

function withConversionRate(row) {
  const total = row.total_leads || 0;
  const won = row.won_leads || 0;
  return { ...row, conversion_rate: total > 0 ? Math.round((won / total) * 1000) / 10 : 0 };
}

/** "My leads/activities/conversion" — shown to every caller regardless of scope, since everyone has their own numbers worth seeing. */
async function getPersonalMetrics(organizationId, userId) {
  const totalsResult = await query(
    `SELECT COUNT(*)::int AS total_leads, COUNT(*) FILTER (WHERE status = 'won')::int AS won_leads
     FROM leads WHERE organization_id = $1 AND assigned_user_id = $2`,
    [organizationId, userId]
  );

  const byStatusResult = await query(
    `SELECT status, COUNT(*)::int AS count FROM leads
     WHERE organization_id = $1 AND assigned_user_id = $2 GROUP BY status`,
    [organizationId, userId]
  );

  const activityCountResult = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE occurred_at >= now() - interval '30 days')::int AS last_30_days
     FROM activities WHERE organization_id = $1 AND created_by_id = $2`,
    [organizationId, userId]
  );

  const recentLeadsResult = await query(
    `SELECT id, name, status, created_at FROM leads
     WHERE organization_id = $1 AND assigned_user_id = $2
     ORDER BY created_at DESC LIMIT 5`,
    [organizationId, userId]
  );

  const recentActivitiesResult = await query(
    `SELECT a.id, a.type, a.notes, a.occurred_at, l.name AS lead_name, l.id AS lead_id
     FROM activities a JOIN leads l ON l.id = a.lead_id
     WHERE a.organization_id = $1 AND a.created_by_id = $2
     ORDER BY a.occurred_at DESC LIMIT 5`,
    [organizationId, userId]
  );

  return {
    ...withConversionRate(totalsResult.rows[0]),
    leadsByStatus: byStatusResult.rows,
    activities: activityCountResult.rows[0],
    recentLeads: recentLeadsResult.rows,
    recentActivities: recentActivitiesResult.rows,
  };
}

/**
 * Team Lead / Sales Manager view: a leaderboard of everyone on their team.
 * leads and activities are joined in the same query for one round trip,
 * but that join produces a row per (lead × activity) combination for a
 * user with both — COUNT(DISTINCT ...) is what keeps the totals correct
 * despite that, rather than switching to N+1 per-user queries.
 */
async function getTeamLeaderboard(organizationId, teamId) {
  const result = await query(
    `SELECT u.id, u.name,
            COUNT(DISTINCT l.id)::int AS total_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won')::int AS won_leads,
            COUNT(DISTINCT a.id)::int AS activity_count
     FROM users u
     LEFT JOIN leads l ON l.assigned_user_id = u.id AND l.organization_id = $1
     LEFT JOIN activities a ON a.created_by_id = u.id AND a.organization_id = $1
     WHERE u.organization_id = $1 AND u.team_id = $2 AND u.is_active = true
     GROUP BY u.id, u.name
     ORDER BY won_leads DESC, total_leads DESC`,
    [organizationId, teamId]
  );
  return result.rows.map(withConversionRate);
}

/** Director / org-admin view: totals across the whole org, plus top teams and top individual performers. */
async function getOrganizationMetrics(organizationId) {
  const totalsResult = await query(
    `SELECT COUNT(*)::int AS total_leads, COUNT(*) FILTER (WHERE status = 'won')::int AS won_leads
     FROM leads WHERE organization_id = $1`,
    [organizationId]
  );

  const byStatusResult = await query(
    `SELECT status, COUNT(*)::int AS count FROM leads WHERE organization_id = $1 GROUP BY status`,
    [organizationId]
  );

  const activityTotalResult = await query(
    `SELECT COUNT(*)::int AS total FROM activities WHERE organization_id = $1`,
    [organizationId]
  );

  const topTeamsResult = await query(
    `SELECT t.id, t.name,
            COUNT(DISTINCT l.id)::int AS total_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won')::int AS won_leads
     FROM teams t
     LEFT JOIN users u ON u.team_id = t.id
     LEFT JOIN leads l ON l.assigned_user_id = u.id AND l.organization_id = $1
     WHERE t.organization_id = $1
     GROUP BY t.id, t.name
     ORDER BY won_leads DESC, total_leads DESC
     LIMIT 10`,
    [organizationId]
  );

  const topExecutivesResult = await query(
    `SELECT u.id, u.name, t.name AS team_name,
            COUNT(DISTINCT l.id)::int AS total_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'won')::int AS won_leads
     FROM users u
     LEFT JOIN teams t ON t.id = u.team_id
     LEFT JOIN leads l ON l.assigned_user_id = u.id AND l.organization_id = $1
     WHERE u.organization_id = $1 AND u.is_active = true
     GROUP BY u.id, u.name, t.name
     ORDER BY won_leads DESC, total_leads DESC
     LIMIT 10`,
    [organizationId]
  );

  return {
    ...withConversionRate(totalsResult.rows[0]),
    leadsByStatus: byStatusResult.rows,
    totalActivities: activityTotalResult.rows[0].total,
    topTeams: topTeamsResult.rows.map(withConversionRate),
    topExecutives: topExecutivesResult.rows.map(withConversionRate),
  };
}

/**
 * One endpoint, shape depends on the caller's role — same data_scope
 * mechanism Module 3 already uses for lead visibility, applied here
 * instead of duplicating a parallel permission system for analytics.
 */
async function getSummary(organizationId, orgUser) {
  const personal = await getPersonalMetrics(organizationId, orgUser.id);

  if (orgUser.isOrgAdmin || orgUser.dataScope === 'organization') {
    const organization = await getOrganizationMetrics(organizationId);
    return { scope: 'organization', personal, organization };
  }

  if (orgUser.dataScope === 'team' && orgUser.teamId) {
    const leaderboard = await getTeamLeaderboard(organizationId, orgUser.teamId);
    return { scope: 'team', personal, team: { leaderboard } };
  }

  return { scope: 'own', personal };
}

module.exports = { getSummary };
