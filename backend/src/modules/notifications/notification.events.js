const { query } = require('../../config/db');
const { subscribe } = require('../../events/eventBus');
const notificationService = require('./notification.service');

/**
 * Registers this module's subscribers on the shared event bus. Sales
 * (Module 3) publishes 'lead.assigned' and 'lead.won' with no idea this
 * file exists — that's the point. Called once at server startup
 * (see server.js); calling it more than once would double-subscribe.
 */
function registerNotificationSubscribers() {
  subscribe('lead.assigned', handleLeadAssigned);
  subscribe('lead.won', handleLeadWon);
}

async function handleLeadAssigned({ organizationId, leadId, assignedUserId, assignedById }) {
  if (!assignedUserId || assignedUserId === assignedById) return; // don't notify someone for assigning a lead to themselves

  const leadResult = await query('SELECT name FROM leads WHERE id = $1', [leadId]);
  const lead = leadResult.rows[0];
  if (!lead) return;

  let assignerName = 'Someone';
  if (assignedById) {
    const assignerResult = await query('SELECT name FROM users WHERE id = $1', [assignedById]);
    assignerName = assignerResult.rows[0]?.name || assignerName;
  }

  await notificationService.create({
    organizationId,
    userId: assignedUserId,
    type: 'lead_assigned',
    title: 'New lead assigned to you',
    body: `${lead.name} was assigned to you by ${assignerName}.`,
    leadId,
  });
}

async function handleLeadWon({ organizationId, leadId, assignedUserId }) {
  const leadResult = await query('SELECT name FROM leads WHERE id = $1', [leadId]);
  const lead = leadResult.rows[0];
  if (!lead) return;

  let assigneeName = 'Someone';
  if (assignedUserId) {
    const assigneeResult = await query('SELECT name FROM users WHERE id = $1', [assignedUserId]);
    assigneeName = assigneeResult.rows[0]?.name || assigneeName;
  }

  // Visibility for leadership on a win, mirroring Module 4's org-wide
  // scope rather than inventing a separate notion of "who should know".
  const adminsResult = await query(
    'SELECT id FROM users WHERE organization_id = $1 AND is_org_admin = true AND is_active = true',
    [organizationId]
  );

  for (const admin of adminsResult.rows) {
    if (admin.id === assignedUserId) continue; // skip notifying someone about closing their own lead
    await notificationService.create({
      organizationId,
      userId: admin.id,
      type: 'lead_won',
      title: 'Lead won',
      body: `${assigneeName} closed ${lead.name}.`,
      leadId,
    });
  }
}

module.exports = { registerNotificationSubscribers };
