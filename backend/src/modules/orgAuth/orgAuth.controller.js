const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./orgAuth.service');

const login = asyncHandler(async (req, res) => {
  const { organizationCode, email, password } = req.body;
  if (!organizationCode || !email || !password) {
    throw ApiError.badRequest('Organization code, email and password are required');
  }
  const result = await service.login({
    organizationCode,
    email,
    password,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return ok(res, result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');
  const result = await service.refresh({ refreshToken, userAgent: req.headers['user-agent'], ipAddress: req.ip });
  return ok(res, result);
});

const logout = asyncHandler(async (req, res) => {
  await service.logout({ refreshToken: req.body.refreshToken });
  return ok(res, { loggedOut: true });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('currentPassword and newPassword are required');
  }
  await service.changePassword(req.orgUser.organizationId, req.orgUser.id, { currentPassword, newPassword });
  return ok(res, { changed: true, mustChangePassword: false });
});

const me = asyncHandler(async (req, res) => {
  const user = await service.getById(req.orgUser.organizationId, req.orgUser.id);
  return ok(res, user);
});

module.exports = { login, refresh, logout, changePassword, me };
