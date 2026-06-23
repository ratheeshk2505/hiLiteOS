const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const leadService = require('./lead.service');
const activityService = require('./activity.service');
const {
  validateCreateLead,
  validateUpdateLead,
  validateStatusUpdate,
  validateAssignment,
  validateCreateActivity,
} = require('./lead.validation');

const listAssignableUsers = asyncHandler(async (req, res) => {
  const users = await leadService.listAssignableUsers(req.orgUser.organizationId, req.orgUser);
  return ok(res, users);
});

const create = asyncHandler(async (req, res) => {
  validateCreateLead(req.body);
  const lead = await leadService.createLead(req.orgUser.organizationId, req.orgUser, req.body);
  return ok(res, lead, 201);
});

const list = asyncHandler(async (req, res) => {
  const { search, status, project, assignedUserId, page, pageSize } = req.query;
  const { rows, meta } = await leadService.listLeads(req.orgUser.organizationId, req.orgUser, {
    search,
    status,
    project,
    assignedUserId,
    page,
    pageSize,
  });
  return ok(res, rows, 200, meta);
});

const getById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLead(req.orgUser.organizationId, req.orgUser, req.params.id);
  return ok(res, lead);
});

const update = asyncHandler(async (req, res) => {
  validateUpdateLead(req.body);
  const lead = await leadService.updateLead(req.orgUser.organizationId, req.orgUser, req.params.id, req.body);
  return ok(res, lead);
});

const updateStatus = asyncHandler(async (req, res) => {
  validateStatusUpdate(req.body);
  const lead = await leadService.updateStatus(req.orgUser.organizationId, req.orgUser, req.params.id, req.body.status);
  return ok(res, lead);
});

const assign = asyncHandler(async (req, res) => {
  validateAssignment(req.body);
  const lead = await leadService.assignLead(req.orgUser.organizationId, req.orgUser, req.params.id, req.body);
  return ok(res, lead);
});

const createActivity = asyncHandler(async (req, res) => {
  validateCreateActivity(req.body);
  const activity = await activityService.createActivity(req.orgUser.organizationId, req.orgUser, req.params.id, req.body);
  return ok(res, activity, 201);
});

const listActivities = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const { rows, meta } = await activityService.listActivities(req.orgUser.organizationId, req.orgUser, req.params.id, { page, pageSize });
  return ok(res, rows, 200, meta);
});

module.exports = { create, list, getById, update, updateStatus, assign, createActivity, listActivities, listAssignableUsers };
