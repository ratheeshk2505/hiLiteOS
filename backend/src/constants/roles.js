// Kept in one place so the app-level seeding (organization.service.js,
// for orgs created after Module 2 shipped) and the migration's backfill
// (for orgs created before it) can't drift apart.
//
// dataScope determines how much lead data (Module 3) a holder of that
// role can see: 'own' (just their own leads), 'team' (their team's), or
// 'organization' (everything). This mirrors the assessment's suggested
// hierarchy (Executive -> own, Team Lead/Sales Manager -> team,
// Director -> organization).
const DEFAULT_ROLES = [
  { name: 'Executive', dataScope: 'own' },
  { name: 'Team Lead', dataScope: 'team' },
  { name: 'Sales Manager', dataScope: 'team' },
  { name: 'Director', dataScope: 'organization' },
];

const DEFAULT_ROLE_NAMES = DEFAULT_ROLES.map((r) => r.name);

module.exports = { DEFAULT_ROLES, DEFAULT_ROLE_NAMES };
