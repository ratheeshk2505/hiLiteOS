const ApiError = require('../../utils/ApiError');

function validateCreateUser(body) {
  const errors = [];
  if (!body.name || !body.name.trim()) errors.push('Name is required');
  if (!body.email || !body.email.trim()) {
    errors.push('Email is required');
  } else if (!/^\S+@\S+\.\S+$/.test(body.email.trim())) {
    errors.push('Email is not valid');
  }
  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
}

function validateStatusPayload(body) {
  if (typeof body.isActive !== 'boolean') {
    throw ApiError.badRequest("Body must include a boolean 'isActive'");
  }
}

module.exports = { validateCreateUser, validateStatusPayload };
