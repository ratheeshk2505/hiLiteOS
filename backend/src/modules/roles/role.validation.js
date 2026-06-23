const ApiError = require('../../utils/ApiError');

const VALID_SCOPES = ['own', 'team', 'organization'];

function validateRolePayload(body) {
  if (!body.name || !body.name.trim()) {
    throw ApiError.badRequest('Role name is required');
  }
  if (body.dataScope !== undefined && !VALID_SCOPES.includes(body.dataScope)) {
    throw ApiError.badRequest("dataScope must be one of: 'own', 'team', 'organization'");
  }
}

module.exports = { validateRolePayload };
