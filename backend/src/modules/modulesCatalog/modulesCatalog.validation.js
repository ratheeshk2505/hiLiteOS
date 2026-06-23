const ApiError = require('../../utils/ApiError');

const KEY_PATTERN = /^[a-z0-9_]+$/;

function validateCreateModule(body) {
  const errors = [];

  if (!body.key || !body.key.trim()) {
    errors.push('Module key is required');
  } else if (!KEY_PATTERN.test(body.key.trim())) {
    errors.push('Module key may only contain lowercase letters, numbers and underscores');
  }
  if (!body.name || !body.name.trim()) errors.push('Module name is required');

  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
}

function validateUpdateModule(body) {
  const errors = [];

  // key is intentionally not editable here — it's the stable identifier
  // every organization_modules row and the seed data reference; renaming
  // it after organizations are already relying on it is a much bigger
  // operation than a name/description tweak.
  if (body.name !== undefined && !body.name.trim()) errors.push('Module name cannot be empty');

  if (errors.length) throw ApiError.badRequest('Validation failed', errors);
}

module.exports = { validateCreateModule, validateUpdateModule };
