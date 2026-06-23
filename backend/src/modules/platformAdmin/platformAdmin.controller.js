const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./platformAdmin.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }
  const result = await service.login({
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
  await service.changePassword(req.platformAdmin.id, { currentPassword, newPassword });
  return ok(res, { changed: true });
});

const me = asyncHandler(async (req, res) => {
  const admin = await service.getById(req.platformAdmin.id);
  return ok(res, admin);
});

module.exports = { login, refresh, logout, changePassword, me };
