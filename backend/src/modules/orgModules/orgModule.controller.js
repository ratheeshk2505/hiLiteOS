const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./orgModule.service');

const list = asyncHandler(async (req, res) => {
  const modules = await service.listForOrganization(req.orgUser.organizationId);
  return ok(res, modules);
});

module.exports = { list };
