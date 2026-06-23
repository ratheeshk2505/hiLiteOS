const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./organization.service');
const { validateCreateOrganization, validateStatusUpdate, validateModulesUpdate } = require('./organization.validation');

const create = asyncHandler(async (req, res) => {
  validateCreateOrganization(req.body);
  const { name, code, logoUrl, description, adminName, adminEmail, enabledModuleKeys } = req.body;
  const result = await service.createOrganization(
    { name, code, logoUrl, description, adminName, adminEmail, enabledModuleKeys },
    req.platformAdmin.id
  );
  return ok(res, result, 201);
});

const list = asyncHandler(async (req, res) => {
  const { search, status, page, pageSize } = req.query;
  const { rows, meta } = await service.listOrganizations({ search, status, page, pageSize });
  return ok(res, rows, 200, meta);
});

const getById = asyncHandler(async (req, res) => {
  const organization = await service.getOrganizationById(req.params.id);
  return ok(res, organization);
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const result = await service.resetAdminPassword(req.params.id, req.platformAdmin.id);
  return ok(res, result);
});

const updateStatus = asyncHandler(async (req, res) => {
  validateStatusUpdate(req.body);
  const organization = await service.updateStatus(req.params.id, req.body.status, req.platformAdmin.id);
  return ok(res, organization);
});

const updateModules = asyncHandler(async (req, res) => {
  validateModulesUpdate(req.body);
  const modules = await service.updateModules(req.params.id, req.body.modules, req.platformAdmin.id);
  return ok(res, modules);
});

module.exports = { create, list, getById, resetAdminPassword, updateStatus, updateModules };
