const ApiError = require('../../utils/ApiError');

const CODE_PATTERN = /^[a-z0-9-]+$/;

function validateCreateOrganization(body) {
  const errors = [];

  if (!body.name || !body.name.trim()) errors.push('Organization name is required');
  if (!body.code || !body.code.trim()) {
    errors.push('Organization code is required');
  } else if (!CODE_PATTERN.test(body.code.trim())) {
    errors.push('Organization code may only contain lowercase letters, numbers and hyphens');
  }
  if (!body.adminName || !body.adminName.trim()) errors.push('Organization admin name is required');
  if (!body.adminEmail || !body.adminEmail.trim()) {
    errors.push('Organization admin email is required');
  } else if (!/^\S+@\S+\.\S+$/.test(body.adminEmail.trim())) {
    errors.push('Organization admin email is not valid');
  }

  if (errors.length) {
    throw ApiError.badRequest('Validation failed', errors);
  }
}

function validateStatusUpdate(body) {
  if (!['active', 'suspended'].includes(body.status)) {
    throw ApiError.badRequest("Status must be either 'active' or 'suspended'");
  }
}

function validateModulesUpdate(body) {
  if (!Array.isArray(body.modules)) {
    throw ApiError.badRequest("Body must include a 'modules' array");
  }
  for (const m of body.modules) {
    if (typeof m.moduleId !== 'number' || typeof m.enabled !== 'boolean') {
      throw ApiError.badRequest("Each module entry needs a numeric 'moduleId' and boolean 'enabled'");
    }
  }
}

module.exports = { validateCreateOrganization, validateStatusUpdate, validateModulesUpdate };
