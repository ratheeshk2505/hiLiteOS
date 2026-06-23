const ApiError = require('../../utils/ApiError');

function validateTeamPayload(body) {
  if (!body.name || !body.name.trim()) {
    throw ApiError.badRequest('Team name is required');
  }
}

module.exports = { validateTeamPayload };
