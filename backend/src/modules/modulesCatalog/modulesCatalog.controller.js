const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./modulesCatalog.service');
const { validateCreateModule, validateUpdateModule } = require('./modulesCatalog.validation');

const list = asyncHandler(async (req, res) => {
  const modules = await service.listAll();
  return ok(res, modules);
});

const create = asyncHandler(async (req, res) => {
  validateCreateModule(req.body);
  const module = await service.create(req.body, req.platformAdmin.id);
  return ok(res, module, 201);
});

const update = asyncHandler(async (req, res) => {
  validateUpdateModule(req.body);
  const module = await service.update(req.params.id, req.body, req.platformAdmin.id);
  return ok(res, module);
});

module.exports = { list, create, update };
