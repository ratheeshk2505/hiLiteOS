const crypto = require('crypto');
const { query } = require('../config/db');
const env = require('../config/env');

function generateRawToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Issues a brand new refresh token row and returns the raw value — the
 * only time the raw value exists outside the client's storage. Only its
 * hash is ever persisted, so a database leak doesn't hand out usable
 * sessions.
 */
async function issueRefreshToken({ subjectType, subjectId, userAgent, ipAddress }) {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (subject_type, subject_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [subjectType, subjectId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
  );

  return rawToken;
}

/**
 * Validates a raw refresh token: must exist, be unrevoked, and unexpired.
 * Returns the underlying row (with subjectId) or null.
 */
async function verifyRefreshToken({ rawToken, subjectType }) {
  const tokenHash = hashToken(rawToken);
  const result = await query(
    `SELECT id, subject_id, expires_at, revoked_at FROM refresh_tokens
     WHERE token_hash = $1 AND subject_type = $2`,
    [tokenHash, subjectType]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row;
}

/**
 * Rotation: every refresh consumes the old token and issues a new one,
 * linked via replaced_by_id. If a refresh token is ever used twice (e.g.
 * it was stolen and both the attacker and the legitimate user try to use
 * it), the second use will find the first one already revoked — a
 * detectable signal of token theft, even though this MVP doesn't yet act
 * on that signal beyond rejecting the reuse.
 */
async function rotateRefreshToken({ oldTokenId, subjectType, subjectId, userAgent, ipAddress }) {
  const newRawToken = await issueRefreshToken({ subjectType, subjectId, userAgent, ipAddress });
  const newTokenHash = hashToken(newRawToken);
  const newRow = await query('SELECT id FROM refresh_tokens WHERE token_hash = $1', [newTokenHash]);

  await query(
    'UPDATE refresh_tokens SET revoked_at = now(), replaced_by_id = $1 WHERE id = $2',
    [newRow.rows[0].id, oldTokenId]
  );

  return newRawToken;
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash]);
}

/** Used when an admin deactivates a user / suspends an org admin's access — kills every active session immediately. */
async function revokeAllForSubject({ subjectType, subjectId }) {
  await query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE subject_type = $1 AND subject_id = $2 AND revoked_at IS NULL',
    [subjectType, subjectId]
  );
}

/** Suspending an organization should end every one of its users' sessions immediately, not just block new logins. */
async function revokeAllForOrganization(organizationId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE subject_type = 'org_user' AND revoked_at IS NULL
       AND subject_id IN (SELECT id FROM users WHERE organization_id = $1)`,
    [organizationId]
  );
}

module.exports = {
  issueRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForSubject,
  revokeAllForOrganization,
};
