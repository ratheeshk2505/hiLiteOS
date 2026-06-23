const ApiError = require('../../utils/ApiError');

const VALID_STATUSES = ['new', 'contacted', 'visit_scheduled', 'site_visit_completed', 'negotiation', 'won', 'lost'];
const VALID_ACTIVITY_TYPES = ['phone_call', 'meeting', 'site_visit', 'virtual_meeting'];

function validateCreateLead(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('Name is required');
  if (!body.mobileNumber || !body.mobileNumber.trim()) errors.push('Mobile number is required');
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email.trim())) errors.push('Email is not valid');
  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
}

/**
 * Partial update — every field is optional, but one supplied as an empty
 * string is still rejected for name/mobileNumber rather than silently
 * clearing a required field. email/source/project may be explicitly
 * cleared (sent as '' or null) since those are optional on the lead itself.
 */
function validateUpdateLead(body) {
  const errors = [];
  if (body.name !== undefined && !body.name.trim()) errors.push('Name cannot be empty');
  if (body.mobileNumber !== undefined && !body.mobileNumber.trim()) errors.push('Mobile number cannot be empty');
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email.trim())) errors.push('Email is not valid');
  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
}

function validateStatusUpdate(body) {
  if (!VALID_STATUSES.includes(body.status)) {
    throw ApiError.badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
}

function validateAssignment(body) {
  if (body.strategy && body.strategy !== 'least_loaded') {
    throw ApiError.badRequest("strategy must be 'least_loaded' if provided");
  }
  if (!body.strategy && !body.assignedUserId) {
    throw ApiError.badRequest('Provide either assignedUserId (manual) or strategy: "least_loaded"');
  }
}

function validateCreateActivity(body) {
  if (!VALID_ACTIVITY_TYPES.includes(body.type)) {
    throw ApiError.badRequest(`type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
  }
}

module.exports = { validateCreateLead, validateUpdateLead, validateStatusUpdate, validateAssignment, validateCreateActivity, VALID_STATUSES, VALID_ACTIVITY_TYPES };
