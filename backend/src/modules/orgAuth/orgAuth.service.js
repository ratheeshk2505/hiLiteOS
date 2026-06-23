const { query } = require('../../config/db');
const { comparePassword, hashPassword } = require('../../utils/password');
const { signOrgUserToken } = require('../../utils/jwt');
const { issueRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken } = require('../../utils/refreshToken');
const { recordAudit } = require('../../utils/auditLog');
const ApiError = require('../../utils/ApiError');

const SUBJECT_TYPE = 'org_user';

// role_id/team_id live on users directly; data_scope comes from a join to
// roles (Module 3) since that's where "own / team / organization" is
// actually defined. A user with no role assigned defaults to the most
// restrictive scope ('own') rather than silently seeing more than intended.
const USER_AUTH_SELECT = `
  SELECT u.id, u.organization_id, u.name, u.email, u.password_hash, u.is_org_admin, u.is_active,
         u.role_id, u.team_id, u.must_change_password, COALESCE(r.data_scope, 'own') AS data_scope
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
`;

/**
 * There's no subdomain routing in this MVP, so the organization is resolved
 * from an explicit "organization code" field on the login form (the same
 * pattern Slack/Notion-style workspace logins use) rather than from the
 * email alone — email is only unique *within* an organization, not
 * globally, so email alone can't safely identify which tenant to log into.
 */
async function login({ organizationCode, email, password, userAgent, ipAddress }) {
  const orgResult = await query(
    'SELECT id, name, status FROM organizations WHERE code = $1',
    [organizationCode.trim().toLowerCase()]
  );
  const organization = orgResult.rows[0];
  if (!organization) {
    throw ApiError.badRequest('Organization not found. Check the organization code and try again.');
  }
  if (organization.status === 'suspended') {
    throw ApiError.forbidden('This organization has been suspended. Contact your platform administrator.');
  }

  const userResult = await query(`${USER_AUTH_SELECT} WHERE u.organization_id = $1 AND u.email = $2`, [
    organization.id,
    email.toLowerCase().trim(),
  ]);
  const user = userResult.rows[0];
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('Your account has been deactivated. Contact your organization admin.');
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = signOrgUserToken(user);
  const refreshToken = await issueRefreshToken({ subjectType: SUBJECT_TYPE, subjectId: user.id, userAgent, ipAddress });

  await recordAudit({
    organizationId: organization.id,
    actorType: SUBJECT_TYPE,
    actorId: user.id,
    action: 'org_user.login',
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, isOrgAdmin: user.is_org_admin, mustChangePassword: user.must_change_password },
    organization: { id: organization.id, name: organization.name },
  };
}

async function refresh({ refreshToken, userAgent, ipAddress }) {
  const tokenRow = await verifyRefreshToken({ rawToken: refreshToken, subjectType: SUBJECT_TYPE });
  if (!tokenRow) throw ApiError.unauthorized('Refresh token is invalid or expired. Please sign in again.');

  // Re-read the user fresh from the DB on every refresh — this is what
  // lets a role/team reassignment or a deactivation actually take effect
  // for someone who's still holding an old access token, instead of
  // waiting for it to expire on its own.
  const userResult = await query(`${USER_AUTH_SELECT} WHERE u.id = $1`, [tokenRow.subject_id]);
  const user = userResult.rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Account no longer active. Please sign in again.');

  const newRefreshToken = await rotateRefreshToken({
    oldTokenId: tokenRow.id,
    subjectType: SUBJECT_TYPE,
    subjectId: user.id,
    userAgent,
    ipAddress,
  });
  const accessToken = signOrgUserToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, name: user.name, email: user.email, isOrgAdmin: user.is_org_admin, mustChangePassword: user.must_change_password },
  };
}

async function logout({ refreshToken }) {
  if (refreshToken) await revokeRefreshToken(refreshToken);
}

async function changePassword(organizationId, userId, { currentPassword, newPassword }) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1 AND organization_id = $2', [userId, organizationId]);
  const user = result.rows[0];
  if (!user) throw ApiError.notFound('User not found');

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect');

  if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');

  const newHash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [newHash, userId]);
  await recordAudit({ organizationId, actorType: SUBJECT_TYPE, actorId: userId, action: 'org_user.password_changed' });
}

async function getById(organizationId, userId) {
  const result = await query(
    `SELECT id, name, email, is_org_admin, is_active, created_at
     FROM users WHERE id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
  if (!result.rows[0]) throw ApiError.notFound('User not found');
  return result.rows[0];
}

module.exports = { login, refresh, logout, changePassword, getById };
