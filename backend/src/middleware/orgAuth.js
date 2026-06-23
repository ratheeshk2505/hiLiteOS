const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Protects routes for any logged-in organization user. Attaches
 * req.orgUser = { id, organizationId, isOrgAdmin } from the token —
 * every tenant-scoped service call in Module 2+ uses req.orgUser.organizationId
 * to filter its queries, never an id from params/body, so one tenant can
 * never read or write another tenant's data through this layer.
 */
function requireOrgUser(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'org_user') {
      return next(ApiError.forbidden('This token is not an organization user token'));
    }
    req.orgUser = {
      id: payload.sub,
      organizationId: payload.organizationId,
      isOrgAdmin: payload.isOrgAdmin,
      roleId: payload.roleId || null,
      teamId: payload.teamId || null,
      dataScope: payload.dataScope || 'own',
    };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Module 2's team/role/user management is admin-only. Stack this after
 * requireOrgUser. Kept as a separate middleware (rather than baked into
 * requireOrgUser) because Module 3+ will let non-admin org users
 * (executives, team leads) hit org-user-scoped endpoints too.
 */
function requireOrgAdmin(req, res, next) {
  if (!req.orgUser?.isOrgAdmin) {
    return next(ApiError.forbidden('Only organization admins can perform this action'));
  }
  return next();
}

module.exports = { requireOrgUser, requireOrgAdmin };
