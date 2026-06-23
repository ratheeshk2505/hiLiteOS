const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Protects platform-admin-only routes. Expects "Authorization: Bearer <token>".
 * Tenant (organization) auth will be a separate middleware in Module 2 —
 * platform admins and org users are deliberately different principals with
 * different tokens, so one can never accidentally be used as the other.
 */
function requirePlatformAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'platform_admin') {
      return next(ApiError.forbidden('This token is not a platform admin token'));
    }
    req.platformAdmin = { id: payload.sub, email: payload.email };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

module.exports = { requirePlatformAdmin };
