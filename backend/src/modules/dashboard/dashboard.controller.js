const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./dashboard.service');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await service.getSummary(req.orgUser.organizationId, req.orgUser);
  return ok(res, summary);
});

module.exports = { getSummary };
