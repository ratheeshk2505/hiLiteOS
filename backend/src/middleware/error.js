const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
  }

  // Postgres unique-violation -> surface as a 409 instead of a 500
  if (err.code === '23505') {
    const friendlyMessages = {
      organizations_code_key: 'An organization with this code already exists.',
      users_organization_id_email_key: 'A user with this email already exists in this organization.',
      teams_organization_id_name_key: 'A team with this name already exists in this organization.',
      roles_organization_id_name_key: 'A role with this name already exists in this organization.',
      modules_key_key: 'A module with this key already exists.',
    };
    return res.status(409).json({
      success: false,
      error: { message: friendlyMessages[err.constraint] || 'A record with this value already exists.' },
    });
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    error: { message: 'Something went wrong on our end.' },
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

module.exports = { errorHandler, notFound };
