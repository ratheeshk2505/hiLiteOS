const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./role.service');
const { validateRolePayload } = require('./role.validation');

const create = asyncHandler(async (req, res) => {
  validateRolePayload(req.body);
  const role = await service.createRole(req.orgUser.organizationId, req.body);
  return ok(res, role, 201);
});

const list = asyncHandler(async (req, res) => {
  const roles = await service.listRoles(req.orgUser.organizationId);
  return ok(res, roles);
});

const update = asyncHandler(async (req, res) => {
  validateRolePayload(req.body);
  const role = await service.updateRole(req.orgUser.organizationId, req.params.id, req.body);
  return ok(res, role);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteRole(req.orgUser.organizationId, req.params.id, req.orgUser.id);
  return ok(res, { deleted: true });
});

module.exports = { create, list, update, remove };
