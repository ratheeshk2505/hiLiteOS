const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signPlatformAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, type: 'platform_admin' },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiresIn }
  );
}

/**
 * Org user tokens carry organizationId and isOrgAdmin directly in the
 * payload. Every tenant-scoped query in Module 2+ filters by the
 * organizationId taken from this token — never from a client-supplied
 * id — which is what actually enforces tenant isolation.
 *
 * roleId/teamId/dataScope are included too (Module 3 onward): the Sales
 * module needs to know how much of an org's lead data a user can see
 * (their own / their team's / the whole org's) without re-querying roles
 * on every single request. Because the access token is short-lived (15m)
 * and gets re-minted on every refresh from a fresh DB read, a role/team
 * reassignment takes effect within one access-token lifetime at most.
 */
function signOrgUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      organizationId: user.organization_id,
      isOrgAdmin: user.is_org_admin,
      roleId: user.role_id || null,
      teamId: user.team_id || null,
      dataScope: user.is_org_admin ? 'organization' : user.data_scope || 'own',
      type: 'org_user',
    },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signPlatformAdminToken, signOrgUserToken, verifyToken };
