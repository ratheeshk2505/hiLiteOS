const { query } = require('../../config/db');
const { comparePassword, hashPassword } = require('../../utils/password');
const { signPlatformAdminToken } = require('../../utils/jwt');
const { issueRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken } = require('../../utils/refreshToken');
const { recordAudit } = require('../../utils/auditLog');
const ApiError = require('../../utils/ApiError');

const SUBJECT_TYPE = 'platform_admin';

async function login({ email, password, userAgent, ipAddress }) {
  const result = await query(
    'SELECT id, name, email, password_hash FROM platform_admins WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const admin = result.rows[0];
  if (!admin) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await comparePassword(password, admin.password_hash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = signPlatformAdminToken(admin);
  const refreshToken = await issueRefreshToken({ subjectType: SUBJECT_TYPE, subjectId: admin.id, userAgent, ipAddress });

  await recordAudit({ actorType: SUBJECT_TYPE, actorId: admin.id, action: 'platform_admin.login' });

  return {
    accessToken,
    refreshToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}

/**
 * Exchanges a still-valid refresh token for a new access token, rotating
 * the refresh token in the process (old one is revoked, a new one is
 * issued) — this limits how long any single refresh token stays usable
 * even under normal operation.
 */
async function refresh({ refreshToken, userAgent, ipAddress }) {
  const tokenRow = await verifyRefreshToken({ rawToken: refreshToken, subjectType: SUBJECT_TYPE });
  if (!tokenRow) throw ApiError.unauthorized('Refresh token is invalid or expired. Please sign in again.');

  const adminResult = await query('SELECT id, name, email FROM platform_admins WHERE id = $1', [tokenRow.subject_id]);
  const admin = adminResult.rows[0];
  if (!admin) throw ApiError.unauthorized('Account no longer exists.');

  const newRefreshToken = await rotateRefreshToken({
    oldTokenId: tokenRow.id,
    subjectType: SUBJECT_TYPE,
    subjectId: admin.id,
    userAgent,
    ipAddress,
  });
  const accessToken = signPlatformAdminToken(admin);

  return { accessToken, refreshToken: newRefreshToken, admin };
}

async function logout({ refreshToken }) {
  if (refreshToken) await revokeRefreshToken(refreshToken);
}

async function changePassword(adminId, { currentPassword, newPassword }) {
  const result = await query('SELECT password_hash FROM platform_admins WHERE id = $1', [adminId]);
  const admin = result.rows[0];
  if (!admin) throw ApiError.notFound('Platform admin not found');

  const matches = await comparePassword(currentPassword, admin.password_hash);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect');

  if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');

  const newHash = await hashPassword(newPassword);
  await query('UPDATE platform_admins SET password_hash = $1 WHERE id = $2', [newHash, adminId]);
  await recordAudit({ actorType: SUBJECT_TYPE, actorId: adminId, action: 'platform_admin.password_changed' });
}

async function getById(id) {
  const result = await query('SELECT id, name, email, created_at FROM platform_admins WHERE id = $1', [id]);
  if (!result.rows[0]) throw ApiError.notFound('Platform admin not found');
  return result.rows[0];
}

module.exports = { login, refresh, logout, changePassword, getById };
