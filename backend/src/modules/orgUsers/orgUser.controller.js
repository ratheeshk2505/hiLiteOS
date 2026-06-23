const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./orgUser.service');
const { validateCreateUser, validateStatusPayload } = require('./orgUser.validation');

const create = asyncHandler(async (req, res) => {
  validateCreateUser(req.body);
  const user = await service.createUser(req.orgUser.organizationId, req.body, req.orgUser.id);
  return ok(res, user, 201);
});

const list = asyncHandler(async (req, res) => {
  const { search, teamId, roleId, status, page, pageSize } = req.query;
  const { rows, meta } = await service.listUsers(req.orgUser.organizationId, { search, teamId, roleId, status, page, pageSize });
  return ok(res, rows, 200, meta);
});

const getById = asyncHandler(async (req, res) => {
  const user = await service.getUserOrThrow(req.orgUser.organizationId, req.params.id);
  return ok(res, user);
});

const updateAssignment = asyncHandler(async (req, res) => {
  const { teamId, roleId } = req.body;
  const user = await service.updateAssignment(req.orgUser.organizationId, req.params.id, { teamId, roleId }, req.orgUser.id);
  return ok(res, user);
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await service.resetPassword(req.orgUser.organizationId, req.params.id, req.orgUser.id);
  return ok(res, user);
});

const updateStatus = asyncHandler(async (req, res) => {
  validateStatusPayload(req.body);
  const user = await service.updateStatus(req.orgUser.organizationId, req.params.id, req.body.isActive, req.orgUser.id);
  return ok(res, user);
});

module.exports = { create, list, getById, updateAssignment, updateStatus, resetPassword };
