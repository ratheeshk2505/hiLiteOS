const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const service = require('./team.service');
const { validateTeamPayload } = require('./team.validation');

const create = asyncHandler(async (req, res) => {
  validateTeamPayload(req.body);
  const team = await service.createTeam(req.orgUser.organizationId, req.body);
  return ok(res, team, 201);
});

const list = asyncHandler(async (req, res) => {
  const teams = await service.listTeams(req.orgUser.organizationId);
  return ok(res, teams);
});

const update = asyncHandler(async (req, res) => {
  validateTeamPayload(req.body);
  const team = await service.updateTeam(req.orgUser.organizationId, req.params.id, req.body);
  return ok(res, team);
});

const remove = asyncHandler(async (req, res) => {
  await service.deleteTeam(req.orgUser.organizationId, req.params.id, req.orgUser.id);
  return ok(res, { deleted: true });
});

module.exports = { create, list, update, remove };
